import { Form } from "@raycast/api";
import { SetStateAction } from "react";
/**
 * Shorthands for common validation cases
 */
export declare enum FormValidation {
    /** Show an error when the value of the item is empty */
    Required = "required"
}
type ValidationError = string | undefined | null;
type Validator<ValueType> = ((value: ValueType | undefined) => ValidationError) | FormValidation;
type Validation<T extends Form.Values> = {
    [id in keyof T]?: Validator<T[id]>;
};
interface FormProps<T extends Form.Values> {
    /** Function to pass to the `onSubmit` prop of the `<Action.SubmitForm>` element. It wraps the initial `onSubmit` argument with some goodies related to the validation. */
    handleSubmit: (values: T) => void | boolean | Promise<void | boolean>;
    /** The props that must be passed to the `<Form.Item>` elements to handle the validations. */
    itemProps: {
        [id in keyof Required<T>]: Partial<Form.ItemProps<T[id]>> & {
            id: string;
        };
    };
    /** Function that can be used to programmatically set the validation of a specific field. */
    setValidationError: (id: keyof T, error: ValidationError) => void;
    /** Function that can be used to programmatically set the value of a specific field. */
    setValue: <K extends keyof T>(id: K, value: SetStateAction<T[K]>) => void;
    /** The current values of the form. */
    values: T;
    /** Function that can be used to programmatically focus a specific field. */
    focus: (id: keyof T) => void;
    /** Function that can be used to reset the values of the Form. */
    reset: (initialValues?: Partial<T>) => void;
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
declare function useForm<T extends Form.Values>(props: {
    /** Callback that will be called when the form is submitted and all validations pass. */
    onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
    /** The initial values to set when the Form is first rendered. */
    initialValues?: Partial<T>;
    /** The validation rules for the Form. A validation for a Form item is a function that takes the current value of the item as an argument and must return a string when the validation is failing.
     *
     * There are also some shorthands for common cases, see {@link FormValidation}.
     * */
    validation?: Validation<T>;
}): FormProps<T>;
export { useForm };
//# sourceMappingURL=useForm.d.ts.map