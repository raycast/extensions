import { ActionPanel, Action, Form, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import net from "net";

function isValidIpInput(value: string) {
  return /^[0-9.]*$/.test(value);
}

function isValidIpFormat(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255 && part === n.toString();
  });
}

async function scanPort(ip: string, port: number, timeout = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isOpen = false;

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      isOpen = true;
      socket.destroy();
    });

    socket.once("timeout", () => socket.destroy());
    socket.once("error", () => socket.destroy());
    socket.once("close", () => resolve(isOpen));

    socket.connect(port, ip);
  });
}

export default function PortScanner() {
  const [openPorts, setOpenPorts] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { ip: string }) {
    if (!isValidIpFormat(values.ip)) {
      setError("Please enter a valid IP address (e.g., 192.168.1.1)");
      return;
    }

    setLoading(true);
    setOpenPorts(null);
    setError(undefined);

    await showToast({ title: "Scanning in progress...", style: Toast.Style.Animated });

    const portsToScan = Array.from({ length: 1024 }, (_, i) => i + 1);
    const results = await Promise.all(
      portsToScan.map(async (port) => ((await scanPort(values.ip, port)) ? port : null)),
    );
    const found = results.filter((p): p is number => p !== null);

    setOpenPorts(found);
    setLoading(false);

    if (found.length === 0) {
      await showToast({ title: "No open ports found", style: Toast.Style.Failure });
    } else {
      await showToast({
        title: "Scan completed",
        message: `${found.length} open ports found`,
        style: Toast.Style.Success,
      });
    }
  }

  if (openPorts) {
    return (
      <List isLoading={loading} navigationTitle="Open Ports">
        {openPorts.map((port) => (
          <List.Item key={port} title={`Port ${port}`} />
        ))}
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Port Scanner"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scan" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="IP Address"
        placeholder="192.168.1.1"
        value={ip}
        onChange={(value) => {
          if (!isValidIpInput(value)) return;
          setIp(value);
          if (value.length === 0) setError(undefined);
          else if (!isValidIpFormat(value)) setError("Please enter a valid IP (only numbers and dots)");
          else setError(undefined);
        }}
        error={error}
      />
      //ciao
    </Form>
  );
}
