import React from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Youtube, Linkedin, Disc as Tiktok } from 'lucide-react';
import Switchers from '@/components/footer/switchers';

const LINK_CLASS_NAME = 'text-[18px] text-gray-600 hover:text-black transition-colors';
const HEADING_CLASS_NAME = 'font-bold text-gray-900 text-[18px] tracking-wide mb-3 uppercase';

const HELP_LINKS = [
  'registration',
  'payment',
  'payLater',
  'delivery',
  'checkout',
  'moirge',
  'giftWrapping',
  'exchangeOnline',
] as const;
const INFORMATION_LINKS = [
  'brands',
  'giftCard',
  'dressupCard',
  'collab',
  'productCare',
  'terms',
  'privacy',
] as const;
const COMPANY_LINKS = ['about', 'history', 'stores', 'exchangeStores', 'blog'] as const;

export default function MainFooter() {
  const { t } = useTranslation('footer');
  return (
    <footer className="w-full bg-[#FAFAFA] border-t border-gray-200 pt-20 pb-16 font-sans select-none text-gray-800 [&_select]:!text-[18px]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-16">

        {/* 4 Columns Layout with comfortable spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">

          {/* Column 1: Help */}
          <div className="flex flex-col space-y-4">
            <h3 className={HEADING_CLASS_NAME}>{t('main.help.title')}</h3>
            {HELP_LINKS.map((key) => (
              <a key={key} href="#" className={LINK_CLASS_NAME}>
                {t(`main.help.${key}`)}
              </a>
            ))}
          </div>

          {/* Column 2: Information */}
          <div className="flex flex-col space-y-4">
            <h3 className={HEADING_CLASS_NAME}>{t('main.information.title')}</h3>
            {INFORMATION_LINKS.map((key) => (
              <a key={key} href="#" className={LINK_CLASS_NAME}>
                {t(`main.information.${key}`)}
              </a>
            ))}
          </div>

          {/* Column 3: Company */}
          <div className="flex flex-col space-y-4">
            <h3 className={HEADING_CLASS_NAME}>{t('main.company.title')}</h3>
            {COMPANY_LINKS.map((key) => (
              <a key={key} href="#" className={LINK_CLASS_NAME}>
                {t(`main.company.${key}`)}
              </a>
            ))}
          </div>

          {/* Column 4: Contact & Apps */}
          <div className="flex flex-col space-y-6">
            <div>
              <h3 className={HEADING_CLASS_NAME}>{t('main.contact.title')}</h3>
              <p className="text-[18px] text-gray-900 font-semibold mb-1.5">(+995) 032 2 38 48 68</p>
              <p className="text-[18px] text-gray-600 break-all leading-relaxed">info@dressup.ge | corporate@dressup.ge</p>
            </div>

            {/* Social Media Icons */}
            <div className="flex items-center space-x-3.5 pt-1">
              <a href="#" aria-label={t('socialMedia.facebookLabel')} className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-black hover:text-white flex items-center justify-center transition-all">
                <Facebook size={28} />
              </a>
              <a href="#" aria-label={t('socialMedia.instagramLabel')} className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-black hover:text-white flex items-center justify-center transition-all">
                <Instagram size={28} />
              </a>
              <a href="#" aria-label="TikTok" className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-black hover:text-white flex items-center justify-center transition-all">
                <Tiktok size={28} />
              </a>
              <a href="#" aria-label={t('socialMedia.youtubeLabel')} className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-black hover:text-white flex items-center justify-center transition-all">
                <Youtube size={28} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-black hover:text-white flex items-center justify-center transition-all">
                <Linkedin size={18} />
              </a>
            </div>

            {/* App Download Section */}
            <div className="pt-2">
              <h4 className="font-bold text-gray-900 text-[18px] tracking-wide mb-3 uppercase">
                {t('main.apps.title')}
              </h4>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <a href="#" className="inline-block">
                  <img
                    src="/images/apple-pay-badge.png"
                    alt={t('main.apps.appStore')}
                    className="h-11 object-contain"
                  />
                </a>
                <a href="#" className="inline-block">
                  <img
                    src="google-pay-bage.png"
                    alt={t('main.apps.googlePlay')}
                    className="h-11 object-contain"
                  />
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* Language and currency */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <Switchers />
        </div>

      </div>
    </footer>
  );
}
