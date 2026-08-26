interface IconProps {
  className?: string;
}

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.4 12.2 2.5 2.5 4.7-4.9" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5V6.5M16 3.5V6.5" />
    </svg>
  );
}

export function BatIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="1000"
      height="568"
      viewBox="0 0 1000 567.848"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(0 -484.513)">
        <path d="M500 1052.361C224.293 1052.361 0 925.006 0 768.447c0-156.555 224.293-283.935 500-283.935 275.709 0 500 127.38 500 283.935 0 156.559-224.291 283.914-500 283.914Z" />
        <path fill="#fff800" d="M985.982 768.448c0 149.046-217.578 269.892-485.982 269.892-268.388 0-485.968-120.846-485.968-269.892 0-149.066 217.58-269.907 485.968-269.907 268.404 0 485.982 120.84 485.982 269.907Z" />
        <path d="M687.104 557.465s54.646 62.929 13.257 110.944c-41.403 48.023-112.592 33.119-129.153 13.247-16.563-19.868-19.863-149.017-19.863-149.017l-33.125 61.262h-36.425l-33.123-61.262s-3.304 129.149-19.863 149.017c-16.562 19.872-87.752 34.776-129.156-13.247-41.387-48.015 13.244-110.944 13.244-110.944S59.562 620.395 59.562 764.439c0 144.057 175.521 190.42 175.521 190.42-24.843-16.559-49.684-86.104 6.621-104.309 56.29-18.221 105.974 41.385 105.974 41.385s3.12-33.896 54.631-36.428C470.195 852.193 500 973.07 500 973.07s29.805-120.877 97.691-117.563c51.51 2.531 54.646 36.428 54.646 36.428s49.668-59.605 105.976-41.385c56.289 18.205 31.462 87.75 6.621 104.309 0 0 175.521-46.363 175.521-190.42 0-144.044-253.349-206.974-253.35-206.974Z" />
      </g>
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4.2M12 17.2h.01" />
    </svg>
  );
}
