'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Input, Button } from '@/components/ui';

// `key` = clave i18n (footer.links.<key>); el texto visible lo resuelve t().
const footerLinks = {
  productos: [
    { key: 'energy', href: '/productos/energia' },
    { key: 'detox', href: '/productos/detox' },
    { key: 'beauty', href: '/productos/belleza' },
    { key: 'stress', href: '/productos/estres' },
    { key: 'womensHealth', href: '/productos/hormonal' },
    { key: 'mensHealth', href: '/productos/masculino' }
  ],
  soporte: [
    { key: 'shipping', href: '/envios' },
    { key: 'contact', href: '/contacto' },
    { key: 'faq', href: '/faq' }
  ],
  legal: [
    { key: 'terms', href: '/terminos' },
    { key: 'privacy', href: '/privacidad' },
    { key: 'cookies', href: '/cookies' }
  ]
};

const socialLinks = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/TonicLifeMxCorporativo',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/toniclife.corporativo/',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    )
  },
  {
    name: 'WhatsApp',
    href: 'https://api.whatsapp.com/send?phone=5214623356500&text=Hola%20me%20podr%C3%ADan%20ayudar',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.52 3.48A11.83 11.83 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.92c0 2.1.55 4.15 1.59 5.96L0 24l6.29-1.65a11.9 11.9 0 0 0 5.78 1.48h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.48-8.43zM12.08 21.8h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.73.98 1-3.64-.24-.37a9.89 9.89 0 0 1-1.52-5.25c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.46-4.44 9.9-9.89 9.9zm5.43-7.42c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5a9.15 9.15 0 0 1-1.68-2.07c-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.23-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.08 3.18 5.03 4.45.7.3 1.25.48 1.68.62.71.22 1.35.19 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
      </svg>
    )
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@toniclifemxcorporativo9962',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@toniclifemxcorporativo?_r=1&_t=ZS-949JM3nIxrp',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }
];

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="bg-[#3E667D] text-white">
      {/* Newsletter Section */}
      <div className="bg-[#C8DDF2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold text-[#3C677C]">
                {t('newsletterTitle')}
              </h3>
              <p className="text-[#3C677C]/80 mt-1">
                {t('newsletterSubtitle')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Input
                type="email"
                placeholder={t('newsletterPlaceholder')}
                className="sm:w-72 bg-white border-0 text-[#3C677C] placeholder:text-[#3C677C]/60"
              />
              <Button variant="secondary" size="lg">
                {t('newsletterButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo/svg/logo-text-white-r.svg"
                alt="Tonic Life - Tu Centro de Bienestar"
                className="w-[180px] lg:w-[220px] h-auto"
              />
            </Link>
            <p className="mt-4 text-white/70 text-sm leading-relaxed">
              {t('brandDescription')}
            </p>

            {/* Certifications */}
            <div className="flex items-center gap-4 mt-6">
              <div className="bg-white/10 rounded-lg px-3 py-2 text-xs">
                <span className="block font-bold">BBB</span>
                <span className="text-white/70">{t('certAccredited')}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2 text-xs">
                <span className="block font-bold">DSA</span>
                <span className="text-white/70">{t('certMember')}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2 text-xs">
                <span className="block font-bold">FDA</span>
                <span className="text-white/70">{t('certRegistered')}</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-bold text-white mb-4">{t('colProducts')}</h4>
            <ul className="space-y-2">
              {footerLinks.productos.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">{t('colSupport')}</h4>
            <ul className="space-y-2">
              {footerLinks.soporte.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {t(`links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">{t('colContact')}</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <span className="block text-white font-medium">{t('emailLabel')}</span>
                <a
                  href="mailto:informes@toniclife.com"
                  className="hover:text-white transition-colors"
                >
                  informes@toniclife.com
                </a>
              </li>
              <li>
                <span className="block text-white font-medium">{t('scheduleLabel')}</span>
                {t('scheduleSunday')}
                <br />
                {t('scheduleWeek')}
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/60">
              © {new Date().getFullYear()} Tonic Life. {t('rights')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="hover:text-white transition-colors"
                >
                  {t(`links.${link.key}`)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
