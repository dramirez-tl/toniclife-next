import { describe, expect, it } from 'vitest';
import {
  buildGoogleSignupBody,
  buildRegisterBody,
  firstSignupError,
  googleLinkStep,
  googleSignInErrorText,
  hasSignupErrors,
  isPhoneComplete,
  passwordChecks,
  signupCountry,
  signupFailure,
  signupFailureText,
  splitFullName,
  validateGoogleSignup,
  validateRegister,
  type GoogleSignupValues,
  type RegisterValues,
  type SignupFailure,
} from './public-signup';

const httpError = (status: number, data: unknown) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data },
});
const networkError = { message: 'Network Error' };

const googleValues: GoogleSignupValues = {
  firstName: 'Ana',
  lastName: 'López Hernández',
  phone: '',
  acceptTerms: true,
};

const registerValues: RegisterValues = {
  ...googleValues,
  email: 'ana@example.com',
  password: 'Segura#2026',
  confirmPassword: 'Segura#2026',
};

describe('public-signup · prellenar nombre y apellidos', () => {
  it('parte el nombre que da Google', () => {
    expect(splitFullName('Ana López')).toEqual({ firstName: 'Ana', lastName: 'López' });
    expect(splitFullName('Ana López Hernández')).toEqual({ firstName: 'Ana', lastName: 'López Hernández' });
    expect(splitFullName('Juan Carlos Pérez Soto')).toEqual({ firstName: 'Juan Carlos', lastName: 'Pérez Soto' });
    // Espacios de sobra no cuentan.
    expect(splitFullName('  Juan   Carlos Pérez  Soto ')).toEqual({ firstName: 'Juan Carlos', lastName: 'Pérez Soto' });
  });

  it('con una palabra o sin nombre deja lo que haya para que la persona lo complete', () => {
    expect(splitFullName('Ana')).toEqual({ firstName: 'Ana', lastName: '' });
    expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
    expect(splitFullName(null)).toEqual({ firstName: '', lastName: '' });
  });
});

describe('public-signup · confirmar la cuenta con Google', () => {
  it('nombre y apellidos de 2 a 100 letras, teléfono opcional y términos aceptados', () => {
    expect(validateGoogleSignup(googleValues)).toEqual({});
    expect(hasSignupErrors({})).toBe(false);
    expect(validateGoogleSignup({ ...googleValues, phone: '+525512345678' })).toEqual({});
  });

  it('dice qué falta', () => {
    expect(validateGoogleSignup({ firstName: ' ', lastName: '', phone: '', acceptTerms: false })).toEqual({
      firstName: 'required',
      lastName: 'required',
      acceptTerms: 'must_accept',
    });
    expect(validateGoogleSignup({ ...googleValues, firstName: 'A' })).toEqual({ firstName: 'too_short' });
    expect(validateGoogleSignup({ ...googleValues, lastName: 'x'.repeat(101) })).toEqual({ lastName: 'too_long' });
    // Un teléfono a medias no se manda (el API lo rechazaría).
    expect(validateGoogleSignup({ ...googleValues, phone: '+52551234' })).toEqual({ phone: 'invalid' });
  });

  it('el teléfono vacío vale; si se escribe, va completo para su país', () => {
    expect(isPhoneComplete('')).toBe(true);
    expect(isPhoneComplete(null)).toBe(true);
    expect(isPhoneComplete('+525512345678')).toBe(true);
    expect(isPhoneComplete('+19405550101')).toBe(true);
    expect(isPhoneComplete('+50255512345')).toBe(true);
    expect(isPhoneComplete('+5255123')).toBe(false);
  });

  it('el cuerpo lleva SOLO lo que admite el API, con los términos aceptados', () => {
    expect(buildGoogleSignupBody('ticket-1', { ...googleValues, firstName: '  Ana ', phone: '+525512345678' }, 'mx')).toEqual({
      linkTicket: 'ticket-1',
      firstName: 'Ana',
      lastName: 'López Hernández',
      acceptTerms: true,
      countryCode: 'MX',
      phone: '+525512345678',
    });
    // Sin teléfono y sin un país válido, esas claves no viajan.
    expect(buildGoogleSignupBody('ticket-1', googleValues, 'México')).toEqual({
      linkTicket: 'ticket-1',
      firstName: 'Ana',
      lastName: 'López Hernández',
      acceptTerms: true,
    });
  });
});

describe('public-signup · formulario "Crea tu cuenta"', () => {
  it('un formulario completo pasa', () => {
    expect(validateRegister(registerValues)).toEqual({});
  });

  it('correo, contraseña y confirmación', () => {
    expect(validateRegister({ ...registerValues, email: '' }).email).toBe('required');
    expect(validateRegister({ ...registerValues, email: 'ana@' }).email).toBe('invalid');
    expect(validateRegister({ ...registerValues, password: '', confirmPassword: '' }).password).toBe('required');
    expect(validateRegister({ ...registerValues, password: 'corta', confirmPassword: 'corta' }).password).toBe('weak');
    expect(validateRegister({ ...registerValues, password: 'sinmayusculas#1', confirmPassword: 'sinmayusculas#1' }).password).toBe('weak');
    const long = `Aa1#${'x'.repeat(100)}`;
    expect(validateRegister({ ...registerValues, password: long, confirmPassword: long }).password).toBe('too_long');
    expect(validateRegister({ ...registerValues, confirmPassword: 'Otra#2026' })).toEqual({ confirmPassword: 'mismatch' });
  });

  it('los requisitos de la contraseña se van cumpliendo uno por uno', () => {
    expect(passwordChecks('').every((c) => !c.met)).toBe(true);
    expect(passwordChecks('abc').filter((c) => c.met).map((c) => c.rule)).toEqual(['lower']);
    expect(passwordChecks('Segura#2026').every((c) => c.met)).toBe(true);
    expect(passwordChecks('Segura#2026').map((c) => c.rule)).toEqual(['length', 'upper', 'lower', 'digit', 'special']);
  });

  it('el foco va al primer campo con error, en el orden del formulario', () => {
    expect(firstSignupError({ acceptTerms: 'must_accept', lastName: 'required', email: 'invalid' })).toBe('lastName');
    expect(firstSignupError({ confirmPassword: 'mismatch' })).toBe('confirmPassword');
    expect(firstSignupError({})).toBeNull();
  });

  it('el cuerpo no lleva la confirmación ni nada que el API no conozca', () => {
    const body = buildRegisterBody({ ...registerValues, email: ' ana@example.com ', phone: '+525512345678' }, 'us');
    expect(body).toEqual({
      email: 'ana@example.com',
      password: 'Segura#2026',
      firstName: 'Ana',
      lastName: 'López Hernández',
      phone: '+525512345678',
      countryCode: 'US',
      acceptTerms: true,
    });
    expect(Object.keys(buildRegisterBody(registerValues, null)).sort()).toEqual([
      'acceptTerms',
      'email',
      'firstName',
      'lastName',
      'password',
    ]);
  });
});

describe('public-signup · país de la tienda', () => {
  it('manda la tienda de la que venía la persona', () => {
    expect(signupCountry({ redirect: '/en-us/checkout', storedLocale: 'es-mx' })).toBe('US');
    expect(signupCountry({ redirect: '/es-co/checkout' })).toBe('CO');
  });

  it('sin tienda en el redirect, la que tiene elegida; sin nada, México', () => {
    expect(signupCountry({ redirect: '/checkout', storedLocale: 'en-us' })).toBe('US');
    expect(signupCountry({ redirect: null, storedLocale: 'es-gt' })).toBe('GT');
    expect(signupCountry({ redirect: '/xx-yy/checkout', storedLocale: null })).toBe('MX');
    expect(signupCountry()).toBe('MX');
  });
});

describe('public-signup · qué sigue tras elegir la cuenta de Google', () => {
  it('solo un `canSignUp: true` ofrece crear la cuenta', () => {
    expect(googleLinkStep({ canSignUp: true })).toBe('new_account');
    expect(googleLinkStep({ canSignUp: false })).toBe('existing_account');
    // API anterior: no manda el campo.
    expect(googleLinkStep({})).toBe('existing_account');
    expect(googleLinkStep(null)).toBe('existing_account');
  });
});

describe('public-signup · errores del alta', () => {
  const exists = httpError(409, {
    statusCode: 409,
    code: 'AUTH_ACCOUNT_EXISTS',
    message: 'Ya existe una cuenta con ese correo. Inicia sesión para continuar.',
  });
  const closed = httpError(403, {
    statusCode: 403,
    code: 'AUTH_SIGNUP_CLOSED',
    message: 'Por ahora no se están abriendo cuentas nuevas en la tienda. Si ya eres distribuidor, inicia sesión.',
  });
  const expired = httpError(401, {
    statusCode: 401,
    message: 'El ticket de vinculación con Google expiró. Vuelve a elegir tu cuenta de Google.',
  });
  const invalid = httpError(400, {
    statusCode: 400,
    message: ['El nombre debe tener al menos 2 caracteres', 'El país debe ser un código de 2 letras'],
    error: 'Bad Request',
  });
  const tooMany = httpError(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' });
  const down = httpError(503, { statusCode: 503, message: 'Por ahora no podemos crear tu cuenta. Intenta de nuevo más tarde.' });

  it('clasifica por estado y código', () => {
    expect(signupFailure(exists, 'google')).toBe('account_exists');
    expect(signupFailure(exists, 'form')).toBe('account_exists');
    // El registro anterior respondía 409 sin código.
    expect(signupFailure(httpError(409, { message: 'El email ya está registrado' }), 'form')).toBe('account_exists');
    expect(signupFailure(closed, 'form')).toBe('signup_closed');
    expect(signupFailure(expired, 'google')).toBe('ticket_expired');
    expect(signupFailure(invalid, 'google')).toBe('invalid');
    expect(signupFailure(tooMany, 'form')).toBe('too_many');
    expect(signupFailure(down, 'form')).toBe('unavailable');
    expect(signupFailure(networkError, 'google')).toBe('network');
    expect(signupFailure(httpError(500, { message: 'Internal server error' }), 'form')).toBe('unknown');
  });

  it('un 401 solo es "el paso con Google caducó" en el alta con Google; un 403 sin código no es "tienda cerrada"', () => {
    expect(signupFailure(expired, 'form')).toBe('unknown');
    expect(signupFailure(httpError(403, { message: 'Forbidden' }), 'form')).toBe('unknown');
  });

  const texts: Record<SignupFailure, string> = {
    ticket_expired: 'T:expired',
    account_exists: 'T:exists',
    signup_closed: 'T:closed',
    too_many: 'T:too_many',
    invalid: 'T:invalid',
    unavailable: 'T:unavailable',
    network: 'T:network',
    unknown: 'T:unknown',
  };
  const text = (error: unknown, lang: 'es' | 'en', flow: 'google' | 'form' = 'google') =>
    signupFailureText({ failure: signupFailure(error, flow), error, lang, texts });

  it('en español gana el mensaje del API cuando explica el problema', () => {
    expect(text(exists, 'es')).toBe('Ya existe una cuenta con ese correo. Inicia sesión para continuar.');
    expect(text(closed, 'es')).toBe(
      'Por ahora no se están abriendo cuentas nuevas en la tienda. Si ya eres distribuidor, inicia sesión.',
    );
    expect(text(invalid, 'es')).toBe('El nombre debe tener al menos 2 caracteres, El país debe ser un código de 2 letras');
    expect(text(down, 'es')).toBe('Por ahora no podemos crear tu cuenta. Intenta de nuevo más tarde.');
  });

  it('en inglés se traduce por tipo de error (el mensaje del API viene en español)', () => {
    expect(text(exists, 'en')).toBe('T:exists');
    expect(text(closed, 'en')).toBe('T:closed');
    expect(text(invalid, 'en')).toBe('T:invalid');
  });

  it('lo que el API no explica para la persona usa siempre el texto de la pantalla', () => {
    expect(text(expired, 'es')).toBe('T:expired');
    expect(text(tooMany, 'es')).toBe('T:too_many');
    expect(text(networkError, 'es')).toBe('T:network');
    expect(text(httpError(500, { message: 'Internal server error' }), 'es')).toBe('T:unknown');
    // 400 sin mensaje útil: el texto de la pantalla.
    expect(text(httpError(400, { message: 'Bad Request' }), 'es')).toBe('T:invalid');
  });
});

describe('public-signup · fallo del botón de Google', () => {
  const screen = { generic: 'G', tooMany: 'M', network: 'N' };

  it('demasiados intentos, sin conexión, el mensaje del API (en español) o el genérico', () => {
    const rejected = httpError(401, { message: 'No pudimos validar tu cuenta de Google. Intenta de nuevo.' });
    expect(googleSignInErrorText({ error: rejected, lang: 'es', texts: screen })).toBe(
      'No pudimos validar tu cuenta de Google. Intenta de nuevo.',
    );
    expect(googleSignInErrorText({ error: rejected, lang: 'en', texts: screen })).toBe('G');
    expect(googleSignInErrorText({ error: httpError(429, { message: 'ThrottlerException: Too Many Requests' }), lang: 'es', texts: screen })).toBe('M');
    expect(googleSignInErrorText({ error: networkError, lang: 'es', texts: screen })).toBe('N');
    expect(googleSignInErrorText({ error: httpError(500, { message: 'Internal server error' }), lang: 'es', texts: screen })).toBe('G');
  });
});
