"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useForm = exports.FormValidation = void 0;
const react_1 = require("react");
const useLatest_1 = require("./useLatest");
/**
 * Shorthands for common validation cases
 */
var FormValidation;
(function (FormValidation) {
    /** Show an error when the value of the item is empty */
    FormValidation["Required"] = "required";
})(FormValidation || (exports.FormValidation = FormValidation = {}));
function validationError(validation, value) {
    if (validation) {
        if (typeof validation === "function") {
            return validation(value);
        }
        else if (validation === FormValidation.Required) {
            let valueIsValid = typeof value !== "undefined" && value !== null;
            if (valueIsValid) {
                switch (typeof value) {
                    case "string":
                        valueIsValid = value.length > 0;
                        break;
                    case "object":
                        if (Array.isArray(value)) {
                            valueIsValid = value.length > 0;
                        }
                        else if (value instanceof Date) {
                            valueIsValid = value.getTime() > 0;
                        }
                        break;
                    default:
                        break;
                }
            }
            if (!valueIsValid) {
                return "The item is required";
            }
        }
    }
}
/**
 * Hook that provides a high-level interface to work with Forms, and more particularly, with Form validations. It incorporates all the good practices to provide a great User Experience for your Forms.
 *
 * @returns an object which contains the necessary methods and props to provide a good User Experience in your Form.
 *
 * @example
 * ```
 * import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
 * import { useForm, FormValidation } from "@raycast/utils";
 *
 * interface SignUpFormValues {
 *   nickname: string;
 *   password: string;
 * }
 *
 * export default function Command() {
 *   const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
 *     onSubmit(values) {
 *       showToast(Toast.Style.Success, "Yay!", `${values.nickname} account created`);
 *     },
 *     validation: {
 *       nickname: FormValidation.Required,
 *       password: (value) => {
 *         if (value && value.length < 8) {
 *           return "Password must be at least 8 symbols";
 *         } else if (!value) {
 *           return "The item is required";
 *         }
 *       },
 *     },
 *   });
 *
 *   return (
 *     <Form
 *       actions={
 *         <ActionPanel>
 *           <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
 *         </ActionPanel>
 *       }
 *     >
 *       <Form.TextField title="Nickname" placeholder="Enter your nickname" {...itemProps.nickname} />
 *       <Form.PasswordField
 *         title="Password"
 *         placeholder="Enter password at least 8 characters long"
 *         {...itemProps.password}
 *       />
 *     </Form>
 *   );
 * }
 * ```
 */
function useForm(props) {
    const { onSubmit: _onSubmit, validation, initialValues = {} } = props;
    // @ts-expect-error it's fine if we don't specify all the values
    const [values, setValues] = (0, react_1.useState)(initialValues);
    const [errors, setErrors] = (0, react_1.useState)({});
    const refs = (0, react_1.useRef)({});
    const latestValidation = (0, useLatest_1.useLatest)(validation || {});
    const latestOnSubmit = (0, useLatest_1.useLatest)(_onSubmit);
    const focus = (0, react_1.useCallback)((id) => {
        refs.current[id]?.focus();
    }, [refs]);
    const handleSubmit = (0, react_1.useCallback)(async (values) => {
        let validationErrors = false;
        for (const [id, validation] of Object.entries(latestValidation.current)) {
            const error = validationError(validation, values[id]);
            if (error) {
                if (!validationErrors) {
                    validationErrors = {};
                    // we focus the first item that has an error
                    focus(id);
                }
                validationErrors[id] = error;
            }
        }
        if (validationErrors) {
            setErrors(validationErrors);
            return false;
        }
        const result = await latestOnSubmit.current(values);
        return typeof result === "boolean" ? result : true;
    }, [latestValidation, latestOnSubmit, focus]);
    const setValidationError = (0, react_1.useCallback)((id, error) => {
        setErrors((errors) => ({ ...errors, [id]: error }));
    }, [setErrors]);
    const setValue = (0, react_1.useCallback)(function (id, value) {
        // @ts-expect-error TS is always confused about SetStateAction, but it's fine here
        setValues((values) => ({ ...values, [id]: typeof value === "function" ? value(values[id]) : value }));
    }, [setValues]);
    const itemProps = (0, react_1.useMemo)(() => {
        // we have to use a proxy because we don't actually have any object to iterate through
        // so instead we dynamically create the props when required
        return new Proxy(
        // @ts-expect-error the whole point of a proxy...
        {}, {
            get(target, id) {
                const validation = latestValidation.current[id];
                const value = values[id];
                return {
                    onChange(value) {
                        if (errors[id]) {
                            const error = validationError(validation, value);
                            if (!error) {
                                setValidationError(id, undefined);
                            }
                        }
                        setValue(id, value);
                    },
                    onBlur(event) {
                        const error = validationError(validation, event.target.value);
                        if (error) {
                            setValidationError(id, error);
                        }
                    },
                    error: errors[id],
                    id,
                    // we shouldn't return `undefined` otherwise it will be an uncontrolled component
                    value: typeof value === "undefined" ? null : value,
                    ref: (instance) => {
                        refs.current[id] = instance;
                    },
                };
            },
        });
    }, [errors, latestValidation, setValidationError, values, refs, setValue]);
    const reset = (0, react_1.useCallback)((values) => {
        setErrors({});
        Object.entries(refs.current).forEach(([id, ref]) => {
            if (!values?.[id]) {
                ref?.reset();
            }
        });
        if (values) {
            // @ts-expect-error it's fine if we don't specify all the values
            setValues(values);
        }
    }, [setValues, setErrors, refs]);
    return { handleSubmit, setValidationError, setValue, values, itemProps, focus, reset };
}
exports.useForm = useForm;
