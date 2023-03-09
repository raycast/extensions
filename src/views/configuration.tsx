import { useEffect, useState } from 'react';
import { Action, ActionPanel, Form, Icon, showToast, Toast } from '@raycast/api';
import { useForm } from '@raycast/utils';

import { getAllParamsFromLocalStorage, PARAMETERS, Parameters, saveParamsToLocalStorage } from '@utils/parameters';

interface ConfigurationFormValues {
  model: string;
  temperature: string;
  top_p: string;
  presence_penalty: string;
  frequency_penalty: string;
}

const objectValuesToString = (object: Parameters) => {
  const objectWithStringValues: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(object)) {
    objectWithStringValues[key] = `${value}`;
  }
  return objectWithStringValues;
};

const Configuration = () => {
  const [config, setConfig] = useState<Parameters>({} as Parameters);
  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps, reset } = useForm<ConfigurationFormValues>({
    onSubmit: async (values) => {
      const newConfig: Parameters = {
        model: values.model,
        temperature: parseFloat(values.temperature),
        top_p: parseFloat(values.top_p),
        presence_penalty: parseFloat(values.presence_penalty),
        frequency_penalty: parseFloat(values.frequency_penalty),
      };
      try {
        showToast({
          title: 'Saving configurations',
          style: Toast.Style.Animated,
        });
        await saveParamsToLocalStorage(newConfig);
        showToast({
          title: 'Successfully saved configurations',
          style: Toast.Style.Success,
        });
      } catch (error) {
        showToast({
          title: 'Error occurred when saving configurations',
          style: Toast.Style.Failure,
        });
      }
    },
    initialValues: objectValuesToString(config),
    validation: {
      temperature: PARAMETERS.temperature.validation,
      top_p: PARAMETERS.top_p.validation,
      presence_penalty: PARAMETERS.presence_penalty.validation,
      frequency_penalty: PARAMETERS.frequency_penalty.validation,
    },
  });

  useEffect(() => {
    let isMounted = true;
    const setConfigFromParams = async () => {
      if (isMounted) {
        const params = await getAllParamsFromLocalStorage();
        setIsLoading(false);
        setConfig(params);
      }
    };
    setConfigFromParams();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    reset(objectValuesToString(config));
  }, [config]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title='Save Configuration' icon={Icon.CheckCircle} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title='Model' info={PARAMETERS.model.description} {...itemProps.model}>
        {PARAMETERS.model.data.map((m) => (
          <Form.Dropdown.Item value={m} title={m} key={m} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title='Temperature'
        info={`${PARAMETERS.temperature.description}\n\nDefault: ${PARAMETERS.temperature.default}`}
        {...itemProps.temperature}
      />
      <Form.TextField
        title='top_p'
        info={`${PARAMETERS.top_p.description}\n\nDefault: ${PARAMETERS.top_p.default}`}
        {...itemProps.top_p}
      />
      <Form.TextField
        title='Presence Penalty'
        info={`${PARAMETERS.presence_penalty.description}\n\nDefault: ${PARAMETERS.presence_penalty.default}`}
        {...itemProps.presence_penalty}
      />
      <Form.TextField
        title='Frequency Penalty'
        info={`${PARAMETERS.frequency_penalty.description}\n\nDefault: ${PARAMETERS.frequency_penalty.default}`}
        {...itemProps.frequency_penalty}
      />
    </Form>
  );
};

export default Configuration;
