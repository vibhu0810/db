import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronRight, ExternalLink, Globe, LineChart, Link2, MessageSquare, Star, Users } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const MarketingPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b py-4 px-6 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Logo showText={true} size="md" />
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">Testimonials</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center space-x-4">
            <a href="https://dashboard.saasxlinks.ai/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </a>
            <Link href="/auth?tab=register">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 space-y-6">
              <Badge className="px-3 py-1 text-sm mb-4">SaaS Link Building Made Easy</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Scale Your Link Building Agency With Confidence
              </h1>
              <p className="text-xl text-gray-600 max-w-md">
                The all-in-one platform for managing your link building campaigns, clients, and team members efficiently.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/auth?tab=register">
                  <Button size="lg" className="gap-2">
                    Get Started <ChevronRight size={16} />
                  </Button>
                </Link>
                <a href="#demo">
                  <Button size="lg" variant="outline" className="gap-2">
                    Request Demo <ExternalLink size={16} />
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-4">
                <CheckCircle size={16} className="text-green-500" />
                <span>No credit card required</span>
                <span className="px-2">•</span>
                <CheckCircle size={16} className="text-green-500" />
                <span>14-day free trial</span>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white rounded-xl shadow-xl border overflow-hidden">
                <img 
                  src="/dashboard-preview.svg" 
                  alt="SaaSxLinks Dashboard" 
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/600x400/eef/fff?text=SaaSxLinks+Dashboard";
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="px-3 py-1 text-sm mb-4">Powerful Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need For Link Building Success</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our comprehensive toolkit streamlines your workflow from client onboarding to final delivery.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Link2 size={24} className="text-primary" />
                  </div>
                  <CardTitle>Order Management</CardTitle>
                  <CardDescription>Track and manage all your link building orders in one place</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Centralized order tracking dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Custom order status workflows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>End-to-end visibility for clients</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Users size={24} className="text-primary" />
                  </div>
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>Simplify client communication and collaboration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Client-specific dashboards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Secure document sharing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Automated progress updates</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <MessageSquare size={24} className="text-primary" />
                  </div>
                  <CardTitle>Communication Tools</CardTitle>
                  <CardDescription>Streamline client and team communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Built-in chat system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Order-specific comments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Email notifications</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Globe size={24} className="text-primary" />
                  </div>
                  <CardTitle>Domain Management</CardTitle>
                  <CardDescription>Organize and analyze your link inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Domain rating and metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Custom domain tagging</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Automatic metrics updates</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <LineChart size={24} className="text-primary" />
                  </div>
                  <CardTitle>Analytics & Reports</CardTitle>
                  <CardDescription>Gain valuable insights from your link building efforts</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Performance dashboards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Custom report generation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Client-facing analytics</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 w-fit mb-2">
                    <Star size={24} className="text-primary" />
                  </div>
                  <CardTitle>Feedback System</CardTitle>
                  <CardDescription>Collect and leverage client feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Automated feedback collection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Rating system with insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Service improvement tracking</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="px-3 py-1 text-sm mb-4">Simple Workflow</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How SaaSxLinks Works</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform streamlines your link building process from start to finish
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Setup Your Account</h3>
                <p className="text-gray-600">Create your account and customize your dashboard to match your workflow</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Add Your Clients</h3>
                <p className="text-gray-600">Invite clients to join your workspace with tailored access permissions</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Create Link Orders</h3>
                <p className="text-gray-600">Set up link building orders with detailed specifications and tracking</p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4">4</div>
                <h3 className="text-xl font-semibold mb-2">Track & Deliver</h3>
                <p className="text-gray-600">Monitor progress, get client approvals, and deliver high-quality links</p>
              </div>

              {/* Connecting line */}
              <div className="absolute top-8 left-0 w-full h-0.5 bg-primary/30 hidden md:block"></div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="px-3 py-1 text-sm mb-4">Transparent Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Flexible pricing options designed to scale with your link building business
              </p>
            </div>

            <Tabs defaultValue="monthly" className="w-full max-w-3xl mx-auto mb-12">
              <TabsList className="grid w-64 grid-cols-2 mx-auto">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly (Save 20%)</TabsTrigger>
              </TabsList>
              <TabsContent value="monthly">
                <div className="grid md:grid-cols-3 gap-8 mt-8">
                  {/* Starter Plan */}
                  <Card className="border border-gray-200 flex flex-col">
                    <CardHeader>
                      <CardTitle>Starter</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$49</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>Perfect for small agencies just getting started</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Up to 5 users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>50 monthly orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Basic reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Email support</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Professional Plan */}
                  <Card className="border border-primary flex flex-col shadow-lg relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                    <CardHeader>
                      <CardTitle>Professional</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$99</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>Ideal for growing link building agencies</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Up to 15 users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>200 monthly orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Advanced analytics</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Priority support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>White-label client portal</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Enterprise Plan */}
                  <Card className="border border-gray-200 flex flex-col">
                    <CardHeader>
                      <CardTitle>Enterprise</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$249</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>For established agencies with high volume needs</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Unlimited users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Unlimited orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Custom reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>24/7 priority support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>API access</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Custom integrations</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Contact Sales
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="yearly">
                <div className="grid md:grid-cols-3 gap-8 mt-8">
                  {/* Starter Plan - Yearly */}
                  <Card className="border border-gray-200 flex flex-col">
                    <CardHeader>
                      <CardTitle>Starter</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$39</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>Billed annually ($468/year)</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Up to 5 users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>50 monthly orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Basic reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Email support</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Professional Plan - Yearly */}
                  <Card className="border border-primary flex flex-col shadow-lg relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                    <CardHeader>
                      <CardTitle>Professional</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$79</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>Billed annually ($948/year)</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Up to 15 users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>200 monthly orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Advanced analytics</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Priority support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>White-label client portal</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Enterprise Plan - Yearly */}
                  <Card className="border border-gray-200 flex flex-col">
                    <CardHeader>
                      <CardTitle>Enterprise</CardTitle>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">$199</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      <CardDescription>Billed annually ($2,388/year)</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Unlimited users</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Unlimited orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Custom reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>24/7 priority support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>API access</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Custom integrations</span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Contact Sales
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="px-3 py-1 text-sm mb-4">Client Success Stories</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Hear from link building agencies who have transformed their operations with SaaSxLinks
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <Card className="border-none shadow-md bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-1 mb-4">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "SaaSxLinks has completely transformed how we manage our link building services. We've reduced our operational overhead by 40% while improving client satisfaction."
                  </p>
                  <div className="flex items-center mt-6">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">JD</div>
                    <div className="ml-4">
                      <p className="font-semibold">John Doe</p>
                      <p className="text-sm text-gray-500">CEO, LinkMasters</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonial 2 */}
              <Card className="border-none shadow-md bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-1 mb-4">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "The client portal is a game-changer. Our clients love the transparency, and we love how it reduces the back-and-forth emails. Highly recommend for any link building agency."
                  </p>
                  <div className="flex items-center mt-6">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">JS</div>
                    <div className="ml-4">
                      <p className="font-semibold">Jane Smith</p>
                      <p className="text-sm text-gray-500">Founder, SEO Accelerators</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonial 3 */}
              <Card className="border-none shadow-md bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-1 mb-4">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "We scaled from 50 to 500 monthly link building orders without adding to our team size. The automation and workflow management in SaaSxLinks is simply unmatched."
                  </p>
                  <div className="flex items-center mt-6">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">RJ</div>
                    <div className="ml-4">
                      <p className="font-semibold">Robert Johnson</p>
                      <p className="text-sm text-gray-500">Director, BacklinkPro</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="px-3 py-1 text-sm mb-4">FAQs</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Have questions? We've got answers to common queries about SaaSxLinks
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How does the free trial work?</AccordionTrigger>
                  <AccordionContent>
                    Our 14-day free trial gives you full access to all features with no credit card required. You can test the platform with up to 10 orders and 3 team members. At the end of the trial, you can choose a plan that fits your needs or continue with a limited free version.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Can I white-label the client portal?</AccordionTrigger>
                  <AccordionContent>
                    Yes, white-labeling is available on our Professional and Enterprise plans. You can customize the client portal with your logo, colors, and even use your own domain name to provide a seamless experience for your clients.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Do you offer API access for integrations?</AccordionTrigger>
                  <AccordionContent>
                    API access is available on our Enterprise plan. This allows you to integrate SaaSxLinks with your existing tools and workflows, such as CRM systems, project management software, or custom reporting dashboards.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>How secure is my data on SaaSxLinks?</AccordionTrigger>
                  <AccordionContent>
                    We take security seriously. All data is encrypted both in transit and at rest. We use industry-standard security practices, regular security audits, and maintain strict access controls to protect your information and your clients' data.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Can I upgrade or downgrade my plan later?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can change your plan at any time. If you upgrade, the new pricing takes effect immediately with prorated billing. If you downgrade, the new rate will apply at the start of your next billing cycle.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger>What kind of support do you offer?</AccordionTrigger>
                  <AccordionContent>
                    All plans include email support. Professional plans get priority support with faster response times, while Enterprise plans receive 24/7 priority support with a dedicated account manager. We also offer extensive documentation and video tutorials.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="demo" className="py-20 px-6 bg-primary text-white">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Link Building Business?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8">
              Join hundreds of successful link building agencies that have streamlined their operations with SaaSxLinks
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth?tab=register">
                <Button size="lg" variant="secondary" className="gap-2">
                  Start Your Free Trial
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 gap-2">
                Request Demo
              </Button>
            </div>
            <p className="mt-6 text-white/80 text-sm">
              No credit card required. 14-day free trial. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Logo showText={true} size="md" />
              </div>
              <p className="text-sm">
                The complete platform for modern link building agencies to manage clients, orders, and workflow efficiently.
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="/social/twitter" className="text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
                  </svg>
                </a>
                <a href="/social/facebook" className="text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                  </svg>
                </a>
                <a href="/social/linkedin" className="text-gray-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="/integrations" className="hover:text-white">Integrations</a></li>
                <li><a href="/changelog" className="hover:text-white">Changelog</a></li>
                <li><a href="/roadmap" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="/docs" className="hover:text-white">Documentation</a></li>
                <li><a href="/blog" className="hover:text-white">Blog</a></li>
                <li><a href="/guides" className="hover:text-white">Guides</a></li>
                <li><a href="/support" className="hover:text-white">Support Center</a></li>
                <li><a href="/api" className="hover:text-white">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="hover:text-white">About Us</a></li>
                <li><a href="/careers" className="hover:text-white">Careers</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} SaaSxLinks. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingPage;