import { useState } from 'react';
import { ShoppingBag, Search, Heart, ShoppingCart, User, Menu, X } from 'lucide-react';

interface HeaderProps {
  cartCount?: number;
  wishlistCount?: number;
}

export default function Header({ cartCount = 0, wishlistCount = 0 }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="hidden md:flex items-center justify-between py-2 text-sm border-b border-gray-100">
          <div className="flex items-center gap-6 text-gray-600">
            <span>📧 support@smartecommerce.com</span>
            <span>📞 +254 xxx xxx</span>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <a href="#" className="hover:text-purple-600 transition-colors">Track Order</a>
            <a href="#" className="hover:text-purple-600 transition-colors">Help</a>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-purple-600" />
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Smart Ecommerce
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="/" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
              Home
            </a>
            <a href="/products" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
              Shop
            </a>
            <div className="relative group">
              <button className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Categories
              </button>
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Electronics
                  </a>
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Fashion
                  </a>
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Home & Living
                  </a>
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Sports
                  </a>
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Beauty
                  </a>
                  <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Books
                  </a>
                </div>
              </div>
            </div>
            <a href="/deals" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
              Deals
            </a>
            <a href="/about" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
              About
            </a>
          </nav>

          {/* Right Side Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            {/* Wishlist */}
            <a href="/wishlist" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Heart className="w-5 h-5 text-gray-600" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </a>

            {/* Cart */}
            <a href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </a>

            {/* User Account */}
            <div className="relative group hidden sm:block">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <User className="w-5 h-5 text-gray-600" />
              </button>
              {/* User Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  <a href="/login" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Sign In
                  </a>
                  <a href="/register" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Register
                  </a>
                  <hr className="my-2" />
                  <a href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    My Dashboard
                  </a>
                  <a href="/orders" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    My Orders
                  </a>
                  <a href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    Profile Settings
                  </a>
                </div>
              </div>
            </div>

            {/* Sign In Button (Desktop) */}
            <a
              href="/login"
              className="hidden md:block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all font-medium"
            >
              Sign In
            </a>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {isSearchOpen && (
          <div className="pb-4 animate-fade-in">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in">
          <nav className="px-4 py-4 space-y-2">
            <a href="/" className="block py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors font-medium">
              Home
            </a>
            <a href="/products" className="block py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors font-medium">
              Shop
            </a>
            <a href="/deals" className="block py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors font-medium">
              Deals
            </a>
            <a href="/about" className="block py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors font-medium">
              About
            </a>
            
            <div className="pt-4 border-t border-gray-100">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Categories</p>
              <a href="#" className="block py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors">
                Electronics
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors">
                Fashion
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors">
                Home & Living
              </a>
              <a href="#" className="block py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 px-4 rounded-lg transition-colors">
                Sports
              </a>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <a href="/login" className="block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full text-center font-medium">
                Sign In
              </a>
              <a href="/register" className="block border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-full text-center font-medium">
                Register
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}