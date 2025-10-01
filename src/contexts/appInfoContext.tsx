import { createContext, useContext, ReactNode } from "react";
import { useFarragoAppInfo } from "../hooks/useFarragoAppInfo";
import { FC } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Icon,
  LaunchProps,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { GET_FARRAGO_URL } from "../utils/constants";
import { checkFarragoExists, isFarragoRunning, launchFarrago } from "../utils/helpers";

// * CONTEXT

const FarragoAppInfoContext = createContext<ReturnType<typeof useFarragoAppInfo> | undefined>(undefined);

export function FarragoAppInfoProvider({ children }: { children: ReactNode }) {
  const value = useFarragoAppInfo();
  return <FarragoAppInfoContext.Provider value={value}>{children}</FarragoAppInfoContext.Provider>;
}

// * HOOK

export function useFarragoAppInfoContext() {
  const context = useContext(FarragoAppInfoContext);
  if (!context) throw new Error("useFarragoAppInfoContext must be used within FarragoAppInfoProvider");
  return context;
}

// * HOC

export function withFarragoRunning<P extends LaunchProps>(
  Command: FC<P>,
  opts: { LoadingComponent: FC<{ isLoading: boolean }> },
) {
  if (environment.commandMode !== "view") return Command; // this is only meant for view commands

  return (props: P) => (
    <FarragoAppInfoProvider>
      <FarragoChecker {...props} Command={Command} LoadingComponent={opts.LoadingComponent} />
    </FarragoAppInfoProvider>
  );
}

function FarragoChecker<P extends LaunchProps>(
  props: P & { Command: FC<P>; LoadingComponent: FC<{ isLoading: boolean }> },
) {
  const { loading, appExists, appIsRunning } = useFarragoAppInfoContext();

  if (loading) return <props.LoadingComponent isLoading={true} />;

  if (!appExists)
    return (
      <Detail
        markdown={"Farrago Not Installed"}
        actions={
          <ActionPanel>
            <Action
              title="Get Farrago"
              icon={Icon.Globe}
              onAction={async () => {
                await open(GET_FARRAGO_URL);
                await popToRoot();
              }}
            />
          </ActionPanel>
        }
      />
    );

  if (!appIsRunning)
    return (
      <Detail
        markdown={"Farrago Not Running"}
        actions={
          <ActionPanel>
            <Action
              title="Launch Farrago"
              autoFocus={true}
              icon={Icon.Rocket}
              onAction={async () => {
                await launchFarrago();
                await popToRoot();
              }}
            />
          </ActionPanel>
        }
      />
    );

  return <props.Command {...props} />;
}

// * "HOC" but for no-view commands

export function withFarragoRunningNoView<P extends LaunchProps>(command: (props: P) => any | Promise<any>) {
  return async (props: P) => {
    const farragoExists = await checkFarragoExists();
    if (!farragoExists) {
      showToast({
        title: "Farrago App Not Found",
        style: Toast.Style.Failure,
      });
      return;
    }

    const farragoIsRunning = await isFarragoRunning();
    if (!farragoIsRunning) {
      showToast({
        title: "Farrago Not Running",
        style: Toast.Style.Failure,
      });
      return;
    }

    await command(props);
  };
}
