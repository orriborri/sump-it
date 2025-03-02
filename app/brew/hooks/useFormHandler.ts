import { FormEvent, useState } from "react";

type FormData = {
  methodId?: number;
  beanId?: number;
  grinderId?: number;
};

export const useFormHandler = () => {
  const [formData, setFormData] = useState<FormData>({});

  const handleChange = (key: string, value: number): void => {
    setFormData({
      ...formData,
      [key]: value,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // Implement form submission logic here
  };

  return {
    formData,
    handleChange,
    handleSubmit,
  };
};
