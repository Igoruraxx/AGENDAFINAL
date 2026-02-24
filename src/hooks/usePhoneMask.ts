import { useState } from 'react';

export const usePhoneMask = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const formatPhone = (phone: string): string => {
    // Apenas retorna o valor original para permitir qualquer formato solicitado pelo usuário
    return phone;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue(formatted);
  };

  const setPhoneValue = (phone: string) => {
    setValue(formatPhone(phone));
  };

  const getCleanPhone = (): string => {
    return value.replace(/\D/g, '');
  };

  return {
    value,
    setValue: setPhoneValue,
    onChange: handleChange,
    getCleanPhone,
  };
};
