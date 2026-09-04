import type { Metadata } from 'next';
import './globals.css';

// 工程准备页始终禁止索引，品牌官网元信息在业务实现阶段独立配置。
export const metadata: Metadata = {
  title: 'WEMOVE SPORTS · Make room for play', robots: { index: false, follow: false },
};
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
