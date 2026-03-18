const defaultDecimalScale = 2;
const decimalPattern = /^\d+(?:\.\d+)?$/;

type ParsedDecimal = {
  digits: bigint;
  scale: number;
};

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

export function parseDecimalValue(value: string): ParsedDecimal | undefined {
  const normalizedValue = value.trim();

  if (!decimalPattern.test(normalizedValue)) {
    return undefined;
  }

  const [wholePart, fractionPart = ""] = normalizedValue.split(".");

  return {
    digits: BigInt(`${wholePart}${fractionPart}`),
    scale: fractionPart.length,
  };
}

export function formatParsedDecimal(value: ParsedDecimal): string {
  const sign = value.digits < 0n ? "-" : "";
  const absoluteDigits = (value.digits < 0n ? -value.digits : value.digits)
    .toString()
    .padStart(value.scale + 1, "0");

  if (value.scale === 0) {
    return `${sign}${absoluteDigits}`;
  }

  const wholePart = absoluteDigits.slice(0, -value.scale) || "0";
  const fractionalPart = absoluteDigits.slice(-value.scale).replace(/0+$/, "");

  return fractionalPart.length > 0
    ? `${sign}${wholePart}.${fractionalPart}`
    : `${sign}${wholePart}`;
}

export function roundParsedDecimal(
  value: ParsedDecimal,
  scale = defaultDecimalScale,
): ParsedDecimal {
  if (value.scale <= scale) {
    return value;
  }

  const difference = value.scale - scale;
  const factor = pow10(difference);
  const absoluteDigits = value.digits < 0n ? -value.digits : value.digits;
  const roundedDigits = (absoluteDigits + factor / 2n) / factor;

  return {
    digits: value.digits < 0n ? -roundedDigits : roundedDigits,
    scale,
  };
}

function parseNormalizedDecimal(
  value: string,
  scale = defaultDecimalScale,
): ParsedDecimal | undefined {
  const normalizedValue = normalizeDecimalInput(value, scale);

  return normalizedValue ? parseDecimalValue(normalizedValue) : undefined;
}

function alignParsedDecimals(left: ParsedDecimal, right: ParsedDecimal) {
  const scale = Math.max(left.scale, right.scale);

  return {
    leftDigits: left.digits * pow10(scale - left.scale),
    rightDigits: right.digits * pow10(scale - right.scale),
  };
}

export function normalizeDecimalInput(
  value?: string,
  scale = defaultDecimalScale,
): string | undefined {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = parseDecimalValue(normalizedValue);

  return parsedValue
    ? formatParsedDecimal(roundParsedDecimal(parsedValue, scale))
    : normalizedValue;
}

export function normalizeMoneyAmount(value?: string): string | undefined {
  return normalizeDecimalInput(value, defaultDecimalScale);
}

export function normalizePercentageValue(value?: string): string | undefined {
  return normalizeDecimalInput(value, defaultDecimalScale);
}

export function compareDecimalValues(
  left?: string,
  right?: string,
  scale = defaultDecimalScale,
): number | undefined {
  const parsedLeft = left ? parseNormalizedDecimal(left, scale) : undefined;
  const parsedRight = right ? parseNormalizedDecimal(right, scale) : undefined;

  if (!parsedLeft || !parsedRight) {
    return undefined;
  }

  const { leftDigits, rightDigits } = alignParsedDecimals(
    parsedLeft,
    parsedRight,
  );

  if (leftDigits === rightDigits) {
    return 0;
  }

  return leftDigits > rightDigits ? 1 : -1;
}

export function areEquivalentDecimalValues(
  left?: string,
  right?: string,
  scale = defaultDecimalScale,
): boolean {
  return compareDecimalValues(left, right, scale) === 0;
}

export function isZeroDecimalValue(
  value?: string,
  scale = defaultDecimalScale,
): boolean {
  const parsedValue = value ? parseNormalizedDecimal(value, scale) : undefined;

  return parsedValue?.digits === 0n;
}

export function calculateDiscountedAmount(
  amount: string,
  discountPercentage: string,
  scale = defaultDecimalScale,
): string {
  const parsedAmount = parseNormalizedDecimal(amount, scale);
  const parsedDiscountPercentage = parseNormalizedDecimal(
    discountPercentage,
    scale,
  );

  if (!parsedAmount || !parsedDiscountPercentage) {
    return "";
  }

  const hundredScaled = 100n * pow10(parsedDiscountPercentage.scale);

  if (
    parsedDiscountPercentage.digits < 0n ||
    parsedDiscountPercentage.digits > hundredScaled
  ) {
    return "";
  }

  return formatParsedDecimal(
    roundParsedDecimal(
      {
        digits:
          parsedAmount.digits *
          (hundredScaled - parsedDiscountPercentage.digits),
        scale: parsedAmount.scale + parsedDiscountPercentage.scale + 2,
      },
      scale,
    ),
  );
}

export function calculateDiscountPercentage(
  amount: string,
  discountedAmount: string,
  scale = defaultDecimalScale,
): string {
  const parsedAmount = parseNormalizedDecimal(amount, scale);
  const parsedDiscountedAmount = parseNormalizedDecimal(
    discountedAmount,
    scale,
  );

  if (!parsedAmount || !parsedDiscountedAmount || parsedAmount.digits <= 0n) {
    return "";
  }

  const { leftDigits: amountDigits, rightDigits: discountedDigits } =
    alignParsedDecimals(parsedAmount, parsedDiscountedAmount);

  if (discountedDigits < 0n || discountedDigits > amountDigits) {
    return "";
  }

  const difference = amountDigits - discountedDigits;
  const numerator = difference * 100n * pow10(scale);
  const roundedDigits = (numerator + amountDigits / 2n) / amountDigits;

  return formatParsedDecimal({ digits: roundedDigits, scale });
}

export function normalizeDiscountFields(input: {
  amount: string;
  discountPercentage?: string;
  discountedAmount?: string;
}): {
  discountPercentage?: string;
  discountedAmount?: string;
} {
  const normalizedAmount =
    normalizeMoneyAmount(input.amount) ?? input.amount.trim();
  const normalizedDiscountPercentage = normalizePercentageValue(
    input.discountPercentage,
  );
  const normalizedDiscountedAmount = normalizeMoneyAmount(
    input.discountedAmount,
  );
  const rawDiscountPercentage = input.discountPercentage?.trim();
  const rawDiscountedAmount = input.discountedAmount?.trim();

  if (rawDiscountPercentage) {
    const discountPercentage =
      normalizedDiscountPercentage ?? rawDiscountPercentage;
    const discountedAmount = calculateDiscountedAmount(
      normalizedAmount,
      discountPercentage,
    );

    if (
      !discountedAmount ||
      areEquivalentDecimalValues(discountedAmount, normalizedAmount)
    ) {
      return {};
    }

    return { discountPercentage, discountedAmount };
  }

  if (rawDiscountedAmount) {
    const discountedAmount = normalizedDiscountedAmount ?? rawDiscountedAmount;
    const discountPercentage = calculateDiscountPercentage(
      normalizedAmount,
      discountedAmount,
    );

    if (
      !discountPercentage ||
      areEquivalentDecimalValues(discountedAmount, normalizedAmount)
    ) {
      return {};
    }

    return { discountPercentage, discountedAmount };
  }

  return {};
}
