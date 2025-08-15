'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, AlertTriangle, Scale, BookOpen, Ban, Shield, Globe, Mail } from 'lucide-react'
import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Effective Date: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Important Notice */}
      <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-5 w-5" />
            Important Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 dark:text-yellow-300">
            Decisivis is an educational and informational platform for football match analysis. 
            This service does NOT provide betting advice, gambling recommendations, or financial guidance. 
            All predictions are statistical estimates based on historical data patterns.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Acceptance of Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              By accessing or using Decisivis ("the Service"), you agree to be bound by these Terms of Service 
              ("Terms"). If you do not agree to these Terms, you may not use the Service.
            </p>
            <p>
              You must be at least 18 years old to use this Service. By using the Service, you represent 
              and warrant that you are at least 18 years of age.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              2. Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Decisivis provides:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Statistical analysis of football match data</li>
              <li>Historical performance metrics and trends</li>
              <li>Machine learning-based probability calculations</li>
              <li>Educational insights into sports analytics</li>
              <li>Data visualization and reporting tools</li>
            </ul>
            <p className="mt-4 font-semibold">
              The Service is for informational and educational purposes only.
            </p>
          </CardContent>
        </Card>

        {/* Prohibited Uses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              3. Prohibited Uses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>You agree NOT to use the Service:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>As the sole basis for gambling or betting decisions</li>
              <li>For any illegal or unauthorized purpose</li>
              <li>To violate any laws in your jurisdiction</li>
              <li>To transmit harmful code or malware</li>
              <li>To scrape or harvest data without permission</li>
              <li>To impersonate others or provide false information</li>
              <li>To interfere with or disrupt the Service</li>
              <li>For commercial purposes without authorization</li>
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              4. Disclaimers & Limitations of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">No Gambling Advice</h3>
              <p>
                THE SERVICE DOES NOT PROVIDE BETTING TIPS, GAMBLING ADVICE, OR FINANCIAL RECOMMENDATIONS. 
                Any use of our analysis for gambling purposes is at your own risk.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">No Guarantee of Accuracy</h3>
              <p>
                While we strive for accuracy, we make no guarantees about the correctness, completeness, 
                or reliability of any predictions or analysis. Past performance is not indicative of future results.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Service "As Is"</h3>
              <p>
                The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either 
                express or implied, including but not limited to warranties of merchantability, fitness for 
                a particular purpose, or non-infringement.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Limitation of Liability</h3>
              <p className="uppercase font-semibold">
                IN NO EVENT SHALL DECISIVIS, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR 
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT 
                LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              5. User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>As a user, you are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use complies with all applicable laws</li>
              <li>Using the Service responsibly and ethically</li>
              <li>Understanding that predictions are statistical estimates only</li>
              <li>Making your own informed decisions</li>
            </ul>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              6. Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              All content, features, and functionality of the Service, including but not limited to text, 
              graphics, logos, algorithms, and software, are the exclusive property of Decisivis and are 
              protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, or create derivative works without our express 
              written permission.
            </p>
          </CardContent>
        </Card>

        {/* Account Termination */}
        <Card>
          <CardHeader>
            <CardTitle>7. Account Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We reserve the right to terminate or suspend your account and access to the Service at our 
              sole discretion, without notice, for conduct that we believe:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violates these Terms</li>
              <li>Is harmful to other users or third parties</li>
              <li>Could expose us to liability</li>
            </ul>
          </CardContent>
        </Card>

        {/* Indemnification */}
        <Card>
          <CardHeader>
            <CardTitle>8. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p>
              You agree to indemnify, defend, and hold harmless Decisivis and its officers, directors, 
              employees, and agents from any claims, liabilities, damages, losses, and expenses, including 
              reasonable attorney's fees, arising out of or in any way connected with your access to or 
              use of the Service.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              9. Governing Law
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
              without regard to its conflict of law provisions. Any legal action or proceeding shall be 
              brought exclusively in the courts located in [Your Jurisdiction].
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>10. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p>
              We reserve the right to modify these Terms at any time. If we make material changes, we will 
              notify you by email or by posting a notice on the Service. Your continued use of the Service 
              after any changes constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        {/* Responsible Gaming */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">
              11. Responsible Gaming Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-blue-700 dark:text-blue-300">
            <p>
              If you choose to use any information from our Service in connection with gambling:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gamble responsibly and within your means</li>
              <li>Never bet more than you can afford to lose</li>
              <li>Seek help if gambling becomes a problem</li>
              <li>Be aware that gambling can be addictive</li>
            </ul>
            <div className="mt-4 space-y-2">
              <p><strong>Support Resources:</strong></p>
              <p>BeGambleAware.org | GamCare: 0808 8020 133</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              12. Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p className="mb-4">
              For questions about these Terms, please contact us at:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> legal@decisivis.com</p>
              <p><strong>Support:</strong> support@decisivis.com</p>
              <p><strong>Address:</strong> [Your Company Address]</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agreement */}
      <Card className="mt-8 border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <p className="text-green-700 dark:text-green-300 text-center font-medium">
            By using Decisivis, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
            Privacy Policy
          </Link>
          <Link href="/cookie-policy" className="text-blue-600 hover:text-blue-700 underline">
            Cookie Policy
          </Link>
          <Link href="/responsible-gaming" className="text-blue-600 hover:text-blue-700 underline">
            Responsible Gaming
          </Link>
        </div>
      </div>
    </div>
  )
}