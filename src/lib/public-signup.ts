// public-signup.ts — Alta de la cuenta del público (cliente final de la tienda). Lógica PURA.
//
// Dos caminos llegan a la MISMA cuenta (`customerType: 'final_customer'`: ve y compra lo
// marcado para el público, a precio público, sin puntos, red ni panel de distribuidor):
//   · el formulario "Crea tu cuenta" → POST /auth/register;
//   · Google → POST /auth/google. Si esa cuenta de Google no es de nadie el API responde
//     `requiresAccountLink` + `canSignUp: true`, y la persona confirma sus datos y acepta
//     los términos → POST /auth/google/signup (entrar con Google nunca crea la cuenta sin
//     ese paso: un distribuidor que eligió otra cuenta de Google no debe terminar con una
//     cuenta nueva sin su red).
//
// Aquí vive lo que se puede probar sin pantalla: prellenar nombre y apellidos, las mismas
// validaciones del API (para avisar ANTES de enviar), los cuerpos exactos (el API rechaza
// cualquier propiedad de más) y qué significa cada error. El API sigue siendo la autoridad.

import { DEFAULT_LOCALE, localeCountry, localeFromPathname } from '@/i18n/config';
import { isValidLocalNumber, parsePhone } from '@/lib/phone';
import { catalogErrorCode, catalogErrorMessage, catalogErrorStatus } from '@/lib/storefront/errors';

/** Topes de `RegisterDto` / `GoogleSignupDto` del API. */
export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 100;

// ===== nombre y apellidos =====

/**
 * Parte el nombre que da Google ("Ana López Hernández") para PRELLENAR nombre y apellidos;
 * la persona los corrige si no quedaron bien. Dos palabras: nombre y apellido; tres:
 * nombre y dos apellidos; cuatro o más: dos nombres y el resto.
 */
export function splitFullName(name: string | null | undefined): { firstName: string; lastName: string } {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const given = words.length >= 4 ? 2 : 1;
  return {
    firstName: words.slice(0, given).join(' ').slice(0, NAME_MAX),
    lastName: words.slice(given).join(' ').slice(0, NAME_MAX),
  };
}

// ===== validación =====

export type SignupField = 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'acceptTerms';
export type SignupIssue = 'required' | 'too_short' | 'too_long' | 'invalid' | 'weak' | 'mismatch' | 'must_accept';
export type SignupErrors = Partial<Record<SignupField, SignupIssue>>;

/** Orden en que se revisan (y se enfoca el primero que falla). */
export const SIGNUP_FIELD_ORDER: readonly SignupField[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'password',
  'confirmPassword',
  'acceptTerms',
];

function nameIssue(value: string): SignupIssue | null {
  const text = value.trim();
  if (!text) return 'required';
  if (text.length < NAME_MIN) return 'too_short';
  if (text.length > NAME_MAX) return 'too_long';
  return null;
}

/** El teléfono es opcional; si se escribe, va completo para su país (lo mismo que exige el API). */
export function isPhoneComplete(e164: string | null | undefined): boolean {
  const value = (e164 ?? '').trim();
  if (!value) return true;
  const { country, number } = parsePhone(value);
  return isValidLocalNumber(country, number);
}

export type PasswordRule = 'length' | 'upper' | 'lower' | 'digit' | 'special';

/** Requisitos de la contraseña, en el orden en que se muestran, con cuáles ya se cumplen. */
export function passwordChecks(password: string): { rule: PasswordRule; met: boolean }[] {
  return [
    { rule: 'length', met: password.length >= PASSWORD_MIN },
    { rule: 'upper', met: /[A-Z]/.test(password) },
    { rule: 'lower', met: /[a-z]/.test(password) },
    { rule: 'digit', met: /[0-9]/.test(password) },
    { rule: 'special', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lo que se confirma al crear la cuenta con Google (el correo lo da Google, ya verificado). */
export interface GoogleSignupValues {
  firstName: string;
  lastName: string;
  /** E.164 (`+525512345678`) o vacío. */
  phone: string;
  acceptTerms: boolean;
}

/** Lo que captura el formulario "Crea tu cuenta". */
export interface RegisterValues extends GoogleSignupValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateGoogleSignup(values: GoogleSignupValues): SignupErrors {
  const errors: SignupErrors = {};
  const firstName = nameIssue(values.firstName);
  if (firstName) errors.firstName = firstName;
  const lastName = nameIssue(values.lastName);
  if (lastName) errors.lastName = lastName;
  if (!isPhoneComplete(values.phone)) errors.phone = 'invalid';
  if (!values.acceptTerms) errors.acceptTerms = 'must_accept';
  return errors;
}

export function validateRegister(values: RegisterValues): SignupErrors {
  const errors = validateGoogleSignup(values);
  const email = values.email.trim();
  if (!email) errors.email = 'required';
  else if (!EMAIL_RE.test(email)) errors.email = 'invalid';
  if (!values.password) errors.password = 'required';
  else if (values.password.length > PASSWORD_MAX) errors.password = 'too_long';
  else if (!passwordChecks(values.password).every((check) => check.met)) errors.password = 'weak';
  if (values.password !== values.confirmPassword) errors.confirmPassword = 'mismatch';
  return errors;
}

export const hasSignupErrors = (errors: SignupErrors): boolean => Object.keys(errors).length > 0;

/** Primer campo con error, en el orden del formulario (para llevar ahí el foco). */
export function firstSignupError(errors: SignupErrors): SignupField | null {
  return SIGNUP_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

// ===== país de la tienda =====

/**
 * País de la tienda desde la que la persona se registra (define el país y el almacén de
 * su cuenta). Manda la tienda de la que venía (`?redirect=/en-us/checkout`); sin ella, la
 * que tiene elegida (cookie); sin nada, México. Siempre uno de los países con tienda.
 */
export function signupCountry(input: { redirect?: string | null; storedLocale?: string | null } = {}): string {
  const fromRedirect = localeFromPathname(input.redirect);
  return localeCountry(fromRedirect ?? input.storedLocale ?? DEFAULT_LOCALE);
}

/** Código de país como lo pide el API (dos letras mayúsculas) o `undefined` para no mandarlo. */
function countryForApi(code: string | null | undefined): string | undefined {
  const value = (code ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : undefined;
}

// ===== cuerpos de las peticiones =====
// El API valida con `forbidNonWhitelisted`: una propiedad de más (la casilla de ofertas,
// la confirmación de la contraseña…) hace fallar el alta. Por eso se arman aquí, a mano.

export interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  countryCode?: string;
  acceptTerms: true;
}

export function buildRegisterBody(values: RegisterValues, countryCode?: string | null): RegisterBody {
  const phone = values.phone.trim();
  const country = countryForApi(countryCode);
  return {
    email: values.email.trim(),
    password: values.password,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    ...(phone ? { phone } : {}),
    ...(country ? { countryCode: country } : {}),
    acceptTerms: true,
  };
}

export interface GoogleSignupBody {
  linkTicket: string;
  firstName: string;
  lastName: string;
  acceptTerms: true;
  countryCode?: string;
  phone?: string;
}

export function buildGoogleSignupBody(
  linkTicket: string,
  values: GoogleSignupValues,
  countryCode?: string | null,
): GoogleSignupBody {
  const phone = values.phone.trim();
  const country = countryForApi(countryCode);
  return {
    linkTicket,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    acceptTerms: true,
    ...(country ? { countryCode: country } : {}),
    ...(phone ? { phone } : {}),
  };
}

// ===== respuesta de Google =====

/**
 * Qué sigue cuando Google respondió que esa cuenta no está vinculada a nadie:
 *  - `new_account`: nadie tiene cuenta con ese correo y la tienda admite altas → la
 *    persona confirma sus datos y se crea su cuenta.
 *  - `existing_account`: ese correo ya tiene cuenta (se vincula con ID y contraseña en
 *    /login) o la tienda no está abriendo cuentas. Un API anterior no manda `canSignUp`:
 *    cuenta como `false` (lo de siempre).
 */
export type GoogleLinkStep = 'new_account' | 'existing_account';

export function googleLinkStep(link: { canSignUp?: boolean | null } | null | undefined): GoogleLinkStep {
  return link?.canSignUp === true ? 'new_account' : 'existing_account';
}

// ===== errores del alta =====

export const AUTH_ACCOUNT_EXISTS = 'AUTH_ACCOUNT_EXISTS';
export const AUTH_SIGNUP_CLOSED = 'AUTH_SIGNUP_CLOSED';

export type SignupFailure =
  /** 401 en el alta con Google: el paso con Google caducó (10 min) → pulsar el botón otra vez. */
  | 'ticket_expired'
  /** 409: ya hay una cuenta con ese correo → iniciar sesión. */
  | 'account_exists'
  /** 403 `AUTH_SIGNUP_CLOSED`: la tienda está en "solo miembros" y no se abren cuentas. */
  | 'signup_closed'
  /** 429: tope de altas por IP (10 cada 10 minutos). */
  | 'too_many'
  /** 400: algún dato no pasó la validación del API. */
  | 'invalid'
  /** 503: el servidor no puede crear cuentas por ahora. */
  | 'unavailable'
  /** Sin respuesta del servidor. */
  | 'network'
  | 'unknown';

/** Qué pasó al crear la cuenta. `flow` distingue el 401: solo el alta con Google lleva ticket. */
export function signupFailure(error: unknown, flow: 'google' | 'form'): SignupFailure {
  const status = catalogErrorStatus(error);
  const code = catalogErrorCode(error);
  if (status === null) return 'network';
  if (code === AUTH_ACCOUNT_EXISTS || status === 409) return 'account_exists';
  if (code === AUTH_SIGNUP_CLOSED) return 'signup_closed';
  if (status === 401) return flow === 'google' ? 'ticket_expired' : 'unknown';
  if (status === 429) return 'too_many';
  if (status === 400) return 'invalid';
  if (status === 503) return 'unavailable';
  return 'unknown';
}

/** Errores cuyo mensaje del API está escrito para la persona (en español). */
const API_MESSAGE_FAILURES: ReadonlySet<SignupFailure> = new Set<SignupFailure>([
  'account_exists',
  'signup_closed',
  'invalid',
  'unavailable',
]);

/**
 * Texto para la persona. Con la tienda en español y un error que el API explica, gana
 * su mensaje (dice qué dato está mal); en inglés, o sin mensaje útil, el texto de la
 * pantalla para ese tipo de error.
 */
export function signupFailureText(input: {
  failure: SignupFailure;
  error: unknown;
  lang: 'es' | 'en';
  texts: Record<SignupFailure, string>;
}): string {
  const fallback = input.texts[input.failure];
  if (input.lang !== 'es' || !API_MESSAGE_FAILURES.has(input.failure)) return fallback;
  return catalogErrorMessage(input.error, fallback, { useApiMessage: true });
}

/**
 * Texto cuando falla el botón de Google (`POST /auth/google`): demasiados intentos, el
 * mensaje del API (en español) o el genérico de la pantalla.
 */
export function googleSignInErrorText(input: {
  error: unknown;
  lang: 'es' | 'en';
  texts: { generic: string; tooMany: string; network: string };
}): string {
  const status = catalogErrorStatus(input.error);
  if (status === null) return input.texts.network;
  if (status === 429) return input.texts.tooMany;
  return catalogErrorMessage(input.error, input.texts.generic, { useApiMessage: input.lang === 'es' });
}
