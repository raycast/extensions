import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { validateCSR } from "./zerossl";

export default function ValidateCSR() {
  const { handleSubmit, itemProps } = useForm<{ csr: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Validating");
      try {
        const result = await validateCSR(values.csr);
        toast.style = Toast.Style.Success;
        toast.title = result.valid ? "✅ Valid" : "❌ Invalid";
        toast.message = result.error || result.csrResponse?.join();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      csr: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Validate CSR" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="CSR"
        placeholder="MIICcDCCAVgCAQAwDDEKMAgGA1UEAwwBazCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANstoHAZgWHnUkVqD7E+jT6sZKT/wRby+1V3DRUoChHQZlHj95Deczho5mgYvjdLqUduY7kmHEjEmNK5Az6XiKZ8DhW/z6JopbaytsDgZWdy6F8dBymiaGNZd5QATbCbX0dlxYbGuOP9aEXtVGqtL1apllSEoQsKdi8j6jA9Nu/CQlkhuD41pJhJrc4nlTqFmh36h2tdGjKgG6iSweoQbTaCbzOqXLGWI5OHGU8FammZX1bH0+LqI5QnDx09zGjY0J2S8X0bUacELNE214EV5b8hyPlY4NnI1QrTpdvZQB6YEhbaBgjonrSrdDlqqeQ0oOL3RO8jdVQoVI1Z0hdGLWcCAwEAAaAfMB0GCSqGSIb3DQEJDjEQMA4wDAYDVR0RBAUwA4IBazANBgkqhkiG9w0BAQsFAAOCAQEAvGaa0vZoBO28fMGVz6iofSaDmsP9xmQjaDM/Z5LxL3q+szJoUN6KwpXimG36jNtqqETatZsGW8dk577AH7eHSeQkpD3pZy8eKuxm2HVWIk/rma3CHC14C+Mo+KI65gQShmX3dq6a6sCcw3TGXe4Jyf6lJ0XnZjIeBE3yRcNnOUWlZGqLwHwDQeKWwEPhcdzSC75sccgM4Detr2q9ndKp164Tk32tkcuO6HAcQbtdCHtmese33tsoVJN2TPzfGY2lA/eoXVzFf7arK1D83E/5bnXUwMLB557PBUNwLA3HyaSFEGQ20A7t27DCFYa+dqZKLBuKxYNZN8Qq1dWV29nNkg=="
        {...itemProps.csr}
      />
    </Form>
  );
}
