/**
 * Small inline SVG icons (24×24, stroke = currentColor).
 * Props: size (px, default 24), title (if set, icon is announced; otherwise aria-hidden), className.
 */
function Icon({ size = 24, title, className, children, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

const make = (paths) => {
  const C = (props) => <Icon {...props}>{paths}</Icon>;
  return C;
};

export const HomeIcon = make(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>);
export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const OrdersIcon = make(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>);
export const UserIcon = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>);
export const CartIcon = make(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11L21 7H6.2" /></>);
export const CloseIcon = make(<path d="M6 6l12 12M18 6 6 18" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = make(<path d="M5 12h14" />);
export const CheckIcon = make(<path d="m5 12.5 4.5 4.5L19 7" />);
export const ChevronRightIcon = make(<path d="m9 5 7 7-7 7" />);
export const ChevronLeftIcon = make(<path d="m15 5-7 7 7 7" />);
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />);
export const PhoneIcon = make(<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />);
export const LocationIcon = make(<><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const StoreIcon = make(<><path d="M3 9 4.5 4h15L21 9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M5 11.5V20h14v-8.5" /><path d="M10 20v-5h4v5" /></>);
export const BikeIcon = make(<><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M8.5 17h5l3-7h-4" /><path d="M14 6h3l1.5 8" /></>);
export const WifiOffIcon = make(<><path d="M3 3l18 18" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 4.2-2.4" /><path d="M19 12.5a10 10 0 0 0-3.2-2" /><path d="M2 8.8a15 15 0 0 1 4.3-2.6" /><path d="M12 20h.01" /></>);
export const AlertIcon = make(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>);
export const InfoIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const SuccessIcon = make(<><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></>);
export const RefreshIcon = make(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>);
export const EditIcon = make(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>);
export const TrashIcon = make(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />);
export const ChatIcon = make(<path d="M4 20l1.5-4A8 8 0 1 1 8 19z" />);
export const GlobeIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>);
export const LogoutIcon = make(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>);
export const MenuIcon = make(<path d="M4 6h16M4 12h16M4 18h16" />);
export const ImageIcon = make(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>);
export const CodeIcon = make(<path d="m8 7-5 5 5 5M16 7l5 5-5 5" />);
export const BoxIcon = make(<><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>);

export const SlidersIcon = make(<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>);

/* Category icons */
export const BowlIcon = make(<><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 7.5c0-1 1-1.2 1-2.5M12 7.5c0-1 1-1.2 1-2.5M16 7.5c0-1 1-1.2 1-2.5" /></>);
export const CakeIcon = make(<><rect x="4" y="11" width="16" height="9" rx="1" /><path d="M4 15c2 1.2 4 1.2 5.3 0s4 1.2 5.4 0 4 1.2 5.3 0" /><path d="M12 11V7.5M12 4.5v.01" /></>);
export const BagIcon = make(<><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const MedicalIcon = make(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" /></>);
export const LeafIcon = make(<><path d="M5 19C5 11 10 5 20 5c0 10-6 15-14 15" /><path d="M5 19l8-8" /></>);
export const GridIcon = make(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>);

const CATEGORY_ICONS = {
  all: GridIcon,
  hotels: BowlIcon,
  bakery: CakeIcon,
};

/** <CategoryIcon category="bakery" size={20} /> */
export function CategoryIcon({ category, ...props }) {
  const C = CATEGORY_ICONS[category] || GridIcon;
  return <C {...props} />;
}
