import { forwardRef } from "react";
import React from "react";

interface BaseProps {
  type?: "text" | "number" | "email" | "password" | "textarea";
  className?: string;
  label?: string;
}

type InputProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;
type Props = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ label, type = "text", className = "", ...rest }, ref) => {
    return (
      <div>
        {label && (
          <label className="block font-semibold mb-2 text-gray-700">
            {label}
          </label>
        )}
        {type === "textarea" ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={`w-full border outline-none px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`}
            {...(rest as TextareaProps)}
          />
        ) : (
          <input type={type}
            ref={ref as React.Ref<HTMLInputElement>}
            className={`w-full border outline-none px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 ${className}`}
            {...(rest as InputProps)}
          />
        )}
      </div>
    )
  }
);

Input.displayName = "Input";

export default Input;