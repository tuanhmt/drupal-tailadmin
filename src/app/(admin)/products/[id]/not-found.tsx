import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="card">
      <h1>Product not found</h1>
      <p className="muted">
        The product you&rsquo;re looking for doesn&rsquo;t exist or you don&rsquo;t have access.
      </p>
      <Link href="/products" className="btn">
        Back to products
      </Link>
    </div>
  );
}
