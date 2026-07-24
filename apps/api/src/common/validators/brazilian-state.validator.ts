import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const BRAZILIAN_STATES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

@ValidatorConstraint({ name: 'isBrazilianState', async: false })
export class IsBrazilianStateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && BRAZILIAN_STATES.has(value.toUpperCase());
  }

  defaultMessage(): string {
    return 'UF inválida (use sigla de 2 letras, ex: SP)';
  }
}

export function IsBrazilianState(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBrazilianStateConstraint,
    });
  };
}

export function ValidateBrazilianState(value: string): boolean {
  return BRAZILIAN_STATES.has(value.toUpperCase());
}
