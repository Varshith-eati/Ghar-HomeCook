import './globals.css';
import '../components/account.css';
export const metadata = { title: 'Ghar — A little closer to home', description: 'Discover master chefs, find your everyday meal plan, and make room for a little comfort. A working tiffin subscription demo.' };
export default function RootLayout({ children }) {
  return <html lang="en" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ghar-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}})()` }} />{children}</body></html>;
}
