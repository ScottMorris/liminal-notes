import React from 'react';

// Common props for icons
// Omit 'path' because SVGProps defines it as string (for animation), but we use it for content
type IconBaseProps = Omit<React.SVGProps<SVGSVGElement>, 'path'> & {
  size?: number;
};

const Icon: React.FC<IconBaseProps & { path: React.ReactNode }> = ({ size = 20, path, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {path}
  </svg>
);

export const PuzzleIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M14.25 6.08694C14.25 5.73178 14.4361 5.41076 14.6512 5.1282C14.8721 4.8381 15 4.494 15 4.125C15 3.08947 13.9926 2.25 12.75 2.25C11.5074 2.25 10.5 3.08947 10.5 4.125C10.5 4.494 10.6279 4.8381 10.8488 5.1282C11.064 5.41076 11.25 5.73178 11.25 6.08694V6.08694C11.25 6.44822 10.9542 6.73997 10.593 6.72957C9.18939 6.68914 7.80084 6.58845 6.42989 6.43C6.61626 8.04276 6.72269 9.67987 6.74511 11.3373C6.75007 11.7032 6.45293 12 6.08694 12V12C5.73178 12 5.41076 11.814 5.1282 11.5988C4.8381 11.3779 4.494 11.25 4.125 11.25C3.08947 11.25 2.25 12.2574 2.25 13.5C2.25 14.7426 3.08947 15.75 4.125 15.75C4.494 15.75 4.8381 15.6221 5.1282 15.4012C5.41076 15.186 5.73178 15 6.08694 15V15C6.39613 15 6.64157 15.2608 6.6189 15.5691C6.49306 17.2812 6.27742 18.9682 5.97668 20.6256C7.49458 20.8157 9.03451 20.9348 10.5931 20.9797C10.9542 20.9901 11.2501 20.6983 11.2501 20.337V20.337C11.2501 19.9818 11.0641 19.6608 10.8489 19.3782C10.628 19.0881 10.5001 18.744 10.5001 18.375C10.5001 17.3395 11.5075 16.5 12.7501 16.5C13.9928 16.5 15.0001 17.3395 15.0001 18.375C15.0001 18.744 14.8722 19.0881 14.6513 19.3782C14.4362 19.6608 14.2501 19.9818 14.2501 20.337V20.337C14.2501 20.6699 14.5281 20.9357 14.8605 20.9161C16.6992 20.8081 18.5102 20.5965 20.2876 20.2872C20.5571 18.7389 20.7523 17.1652 20.8696 15.5698C20.8923 15.2611 20.6466 15 20.3371 15V15C19.9819 15 19.6609 15.1861 19.3783 15.4013C19.0882 15.6221 18.7441 15.75 18.3751 15.75C17.3396 15.75 16.5001 14.7427 16.5001 13.5C16.5001 12.2574 17.3396 11.25 18.3751 11.25C18.7441 11.25 19.0882 11.378 19.3783 11.5988C19.6609 11.814 19.9819 12 20.3371 12V12C20.7034 12 21.0008 11.703 20.9959 11.3367C20.9713 9.52413 20.8463 7.73572 20.6261 5.97698C18.7403 6.31916 16.816 6.55115 14.8603 6.66605C14.528 6.68557 14.25 6.41979 14.25 6.08694V6.08694Z" />}
  />
);

export const SearchIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M21 21L15.8033 15.8033M15.8033 15.8033C17.1605 14.4461 18 12.5711 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18C12.5711 18 14.4461 17.1605 15.8033 15.8033Z" />}
  />
);

export const DocumentTextIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M19.5 14.25V11.625C19.5 9.76104 17.989 8.25 16.125 8.25H14.625C14.0037 8.25 13.5 7.74632 13.5 7.125V5.625C13.5 3.76104 11.989 2.25 10.125 2.25H8.25M8.25 15H15.75M8.25 18H12M10.5 2.25H5.625C5.00368 2.25 4.5 2.75368 4.5 3.375V20.625C4.5 21.2463 5.00368 21.75 5.625 21.75H18.375C18.9963 21.75 19.5 21.2463 19.5 20.625V11.25C19.5 6.27944 15.4706 2.25 10.5 2.25Z" />}
  />
);

export const SparklesIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<>
      <path d="M9.8132 15.9038L9 18.75L8.1868 15.9038C7.75968 14.4089 6.59112 13.2403 5.09619 12.8132L2.25 12L5.09619 11.1868C6.59113 10.7597 7.75968 9.59112 8.1868 8.09619L9 5.25L9.8132 8.09619C10.2403 9.59113 11.4089 10.7597 12.9038 11.1868L15.75 12L12.9038 12.8132C11.4089 13.2403 10.2403 14.4089 9.8132 15.9038Z" />
      <path d="M18.2589 8.71454L18 9.75L17.7411 8.71454C17.4388 7.50533 16.4947 6.56117 15.2855 6.25887L14.25 6L15.2855 5.74113C16.4947 5.43883 17.4388 4.49467 17.7411 3.28546L18 2.25L18.2589 3.28546C18.5612 4.49467 19.5053 5.43883 20.7145 5.74113L21.75 6L20.7145 6.25887C19.5053 6.56117 18.5612 7.50533 18.2589 8.71454Z" />
      <path d="M16.8942 20.5673L16.5 21.75L16.1058 20.5673C15.8818 19.8954 15.3546 19.3682 14.6827 19.1442L13.5 18.75L14.6827 18.3558C15.3546 18.1318 15.8818 17.6046 16.1058 16.9327L16.5 15.75L16.8942 16.9327C17.1182 17.6046 17.6454 18.1318 18.3173 18.3558L19.5 18.75L18.3173 19.1442C17.6454 19.3682 17.1182 19.8954 16.8942 20.5673Z" />
    </>}
  />
);

export const WindowMinimizeIcon: React.FC<IconBaseProps> = (props) => (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10.2 1"
      fill="currentColor"
      {...props}
    >
        <rect width="10.2" height="1" />
    </svg>
);

export const WindowMaximizeIcon: React.FC<IconBaseProps> = (props) => (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      {...props}
    >
        <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
);

export const WindowRestoreIcon: React.FC<IconBaseProps> = (props) => (
    <svg
      width={10}
      height={10}
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      {...props}
    >
        <rect x="2.5" y="2.5" width="8" height="8" />
        <path d="M2.5 2.5V0.5H10.5V8.5H8.5" />
    </svg>
);

export const WindowCloseIcon: React.FC<IconBaseProps> = (props) => (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      {...props}
    >
        <path d="M1 1L9 9M9 1L1 9" />
    </svg>
);

export const HashtagIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />}
  />
);

export const DuplicateIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />}
  />
);

export const FolderOpenIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h4.5c.969 0 1.371 1.24 2.029 2H18A2.25 2.25 0 0120.25 6v.776" />}
  />
);

export const FolderIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />}
  />
);

export const PhotoIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />}
  />
);

export const CodeBracketIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />}
  />
);

export const ClipboardIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />}
  />
);

export const PlusSquareIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
  />
);

export const ShareIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M7.21721 10.9071C6.83295 10.2169 6.096 9.75 5.25 9.75C4.00736 9.75 3 10.7574 3 12C3 13.2426 4.00736 14.25 5.25 14.25C6.096 14.25 6.83295 13.7831 7.21721 13.0929M7.21721 10.9071C7.39737 11.2307 7.5 11.6034 7.5 12C7.5 12.3966 7.39737 12.7693 7.21721 13.0929M7.21721 10.9071L16.7828 5.5929M7.21721 13.0929L16.7828 18.4071M16.7828 18.4071C16.6026 18.7307 16.5 19.1034 16.5 19.5C16.5 20.7426 17.5074 21.75 18.75 21.75C19.9926 21.75 21 20.7426 21 19.5C21 18.2574 19.9926 17.25 18.75 17.25C17.904 17.25 17.1671 17.7169 16.7828 18.4071ZM16.7828 5.5929C17.1671 6.28309 17.904 6.75 18.75 6.75C19.9926 6.75 21 5.74264 21 4.5C21 3.25736 19.9926 2.25 18.75 2.25C17.5074 2.25 16.5 3.25736 16.5 4.5C16.5 4.89664 16.6026 5.26931 16.7828 5.5929Z" />}
  />
);

export const PencilSquareIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M16.8617 4.48667L18.5492 2.79917C19.2814 2.06694 20.4686 2.06694 21.2008 2.79917C21.9331 3.53141 21.9331 4.71859 21.2008 5.45083L10.5822 16.0695C10.0535 16.5981 9.40144 16.9868 8.68489 17.2002L6 18L6.79978 15.3151C7.01323 14.5986 7.40185 13.9465 7.93052 13.4178L16.8617 4.48667ZM16.8617 4.48667L19.5 7.12499M18 14V18.75C18 19.9926 16.9926 21 15.75 21H5.25C4.00736 21 3 19.9926 3 18.75V8.24999C3 7.00735 4.00736 5.99999 5.25 5.99999H10" />}
  />
);

export const ChevronDownIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path d="M6 9l6 6 6-6" />}
  />
);

export const CogIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>}
  />
);

export const XMarkIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
  />
);

export const DictionaryIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11h6m-3-3v6" />
    </>}
  />
);

export const RefreshIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />}
  />
);

export const BanIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />}
  />
);

export const BellIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />}
  />
);

export const CheckCircleIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
  />
);

export const EyeIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>}
  />
);

export const EyeSlashIcon: React.FC<IconBaseProps> = (props) => (
  <Icon
    {...props}
    path={<>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </>}
  />
);
