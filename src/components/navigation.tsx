import { Link } from '@tanstack/react-router'

export const Navigation = () => {
  return (
    <nav>
      <Link to="/">ホーム</Link>
      <Link to="/about">About</Link>

      {/* 動的ルートへのリンクは params を渡す */}
      <Link to="/posts/$postId" params={{ postId: '42' }}>
        投稿 #42
      </Link>

      {/* activeProps: アクティブ時にスタイルを付与 */}
      <Link to="/about" activeProps={{ style: { fontWeight: 'bold' } }}>
        About (アクティブ時太字)
      </Link>
    </nav>
  )
}