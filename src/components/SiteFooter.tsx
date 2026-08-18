import { Icon } from '@mintlify/components';

const socials = [
  { type: 'x', url: 'https://x.com/base' },
  { type: 'github', url: 'https://github.com/base' },
  { type: 'discord', url: 'https://discord.com/invite/buildonbase' },
];

const socialIconMap: Record<string, string> = {
  x: 'x-twitter',
  github: 'github',
  discord: 'message-circle',
};

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 mt-24">
      <div className="flex gap-12 justify-between items-center py-10">
        <div className="flex gap-6 flex-wrap">
          {socials.map((social) => {
            const iconName =
              socialIconMap[social.type.toLowerCase()] || social.type;
            return (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
                aria-label={social.type}
              >
                <Icon icon={iconName} size={20} color="currentColor" />
              </a>
            );
          })}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <a
            href="https://base.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            base.org
          </a>
        </div>
      </div>
    </footer>
  );
}
