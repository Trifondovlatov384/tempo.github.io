/**
 * Конфигурация скидок в зависимости от условий рассрочки.
 * Скидка применяется ко всем ценам на странице.
 */

export type InstallmentOption = {
  id: string;
  label: string;
  /** Скидка в процентах (например, 5 = 5% скидка) */
  discountPercent: number;
  /** Описание условий */
  description?: string;
};

/**
 * Варианты условий рассрочки.
 * Будет дополнено позже с конкретными значениями скидок.
 */
export const INSTALLMENT_OPTIONS: InstallmentOption[] = [
  {
    id: "full",
    label: "100% оплата",
    discountPercent: 0,
    description: "Полная оплата без рассрочки",
  },
  // Placeholder options - будут настроены позже
  // {
  //   id: "50_50",
  //   label: "50/50",
  //   discountPercent: 0,
  //   description: "50% сейчас, 50% при сдаче",
  // },
  // {
  //   id: "installment_12",
  //   label: "Рассрочка 12 мес",
  //   discountPercent: 0,
  //   description: "Рассрочка на 12 месяцев",
  // },
];

/**
 * Применить скидку к цене
 */
export function applyDiscount(price: number, discountPercent: number): number {
  if (discountPercent <= 0) return price;
  return Math.round(price * (1 - discountPercent / 100));
}

/**
 * Получить опцию по ID
 */
export function getInstallmentOption(id: string): InstallmentOption | undefined {
  return INSTALLMENT_OPTIONS.find((opt) => opt.id === id);
}
