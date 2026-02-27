interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationErrors {
  [key: string]: string;
}

export const useFormValidation = () => {
  const validateField = (name: string, value: string, rules: ValidationRule): string | null => {
    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      return 'Este campo é obrigatório';
    }

    // If field is empty and not required, skip other validations
    if (!value || value.trim() === '') {
      return null;
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return `Mínimo de ${rules.minLength} caracteres`;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Máximo de ${rules.maxLength} caracteres`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Formato inválido';
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  const validateForm = (data: Record<string, string>, rules: ValidationRules): ValidationErrors => {
    const errors: ValidationErrors = {};

    Object.keys(rules).forEach((fieldName) => {
      const error = validateField(fieldName, data[fieldName] || '', rules[fieldName]);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  };

  const hasErrors = (errors: ValidationErrors): boolean => {
    return Object.keys(errors).length > 0;
  };

  const getFirstError = (errors: ValidationErrors): string | null => {
    const errorKeys = Object.keys(errors);
    return errorKeys.length > 0 ? errors[errorKeys[0]] : null;
  };

  return {
    validateField,
    validateForm,
    hasErrors,
    getFirstError,
  };
};

// Common validation patterns
export const validationPatterns = {
  phone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  cep: /^\d{5}-\d{3}$/,
  money: /^\d+(\.\d{1,2})?$/,
};

// Common validation rules
export const commonValidations = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s']+$/,
    custom: (value: string) => {
      if (value.trim().split(' ').length < 2) {
        return 'Digite o nome completo';
      }
      return null;
    },
  },
  phone: {
    required: true,
    minLength: 3,
  },
  email: {
    required: true,
    pattern: validationPatterns.email,
  },
  value: {
    required: false,
    pattern: validationPatterns.money,
    custom: (value: string) => {
      if (!value || value.trim() === '') return null;
      const numValue = parseFloat(value);
      if (numValue < 0) {
        return 'Valor não pode ser negativo';
      }
      if (numValue > 100000) {
        return 'Valor muito alto';
      }
      return null;
    },
  },
  weeklyFrequency: {
    required: true,
    custom: (value: string) => {
      const numValue = parseInt(value);
      if (numValue < 1 || numValue > 7) {
        return 'Frequência deve ser entre 1 e 7 dias';
      }
      return null;
    },
  },
};
