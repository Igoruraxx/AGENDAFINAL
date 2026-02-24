import { useState } from 'react';

export const usePhoneMask = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 0) return '';
    
    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    }
    
    if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }
    
    if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    
    // Limit to 11 digits
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
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
