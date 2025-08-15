import Link from 'next/link'
import { Shield, FileText, CreditCard, Mail, Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Decisivis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced football analytics platform for educational and informational purposes.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Not betting advice or gambling recommendations.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/data-request" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  Data Request
                </Link>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@decisivis.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  support@decisivis.com
                </a>
              </li>
              <li>
                <a href="mailto:privacy@decisivis.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  Privacy Inquiries
                </a>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Responsible Gaming */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Decisivis. All rights reserved. 18+ Only.
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener" className="hover:text-blue-600">
                BeGambleAware.org
              </a>
              <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener" className="hover:text-blue-600">
                GamCare
              </a>
              <span>Helpline: 0808 8020 133</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}