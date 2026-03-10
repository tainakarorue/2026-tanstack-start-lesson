import { Link } from '@tanstack/react-router'

export const Navigation = () => {
  return (
    <nav className="w-full flex items-center p-4 bg-slate-300">
      <ul className="flex items-center justify-center gap-x-4">
        <li>
          <Link to="/">ホーム</Link>
        </li>
        <li>
          <Link to="/posts">Posts</Link>
        </li>
        <li>
          {/* 動的ルートへのリンクは params を渡す */}
          <Link to="/posts/$postId" params={{ postId: '42' }}>
            投稿 #42
          </Link>
        </li>
        <li>
          {/* activeProps: アクティブ時にスタイルを付与 */}
          <Link to="/about" activeProps={{ style: { fontWeight: 'bold' } }}>
            About (アクティブ時太字)
          </Link>
        </li>
      </ul>
    </nav>
  )
}
