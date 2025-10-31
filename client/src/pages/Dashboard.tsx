import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/cards/StatsCard";
import { RequestsTable } from "@/components/tables/RequestsTable";
import { TaskList } from "@/components/tasks/TaskList";
import ProposalSummaryCard from "@/components/dashboard/ProposalSummaryCard";
import RiskProfileChart from "@/components/dashboard/RiskProfileChart";
import ValueDistributionChart from "@/components/dashboard/ValueDistributionChart";
import DecisionSupportWidget from "@/components/dashboard/DecisionSupportWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import { useUser } from "@/lib/auth";
import { DashboardStats, RecentRequest } from "@/lib/types";
import { useState, useMemo } from "react";
import { 
  Clock, 
  Briefcase, 
  DollarSign, 
  AlertTriangle, 
  PlusCircle, 
  FileText,
  TrendingUp,
  Shield,
  ChevronUp,
  ChevronDown,
  BarChart3,
  PieChart,
  Target,
  Filter,
  X,
  ArrowUp
} from "lucide-react";

// Define filter interface for proposals
interface ProposalFilters {
  selectedCompanies: string[];
  selectedRiskLevels: string[];
  selectedInvestmentTypes: string[];
  expectedReturnMode: 'range' | 'specific';
  expectedReturnRange: number[];
  expectedReturnSpecific: string;
  amountRange: number[];
  amountMin: string;
  amountMax: string;
}

export default function Dashboard() {
  const { data: user } = useUser();
  
  // Section visibility state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    overview: false,
    proposalSummary: false,
    decisionSupport: false,
    analytics: false,
    proposals: false,
    quickActions: false,
    tasks: false
  });

  // Proposal filter state
  const [proposalFilters, setProposalFilters] = useState<ProposalFilters>({
    selectedCompanies: [],
    selectedRiskLevels: [],
    selectedInvestmentTypes: [],
    expectedReturnMode: 'range',
    expectedReturnRange: [0, 50],
    expectedReturnSpecific: '',
    amountRange: [0, 10000000],
    amountMin: '',
    amountMax: ''
  });

  const [isProposalFilterOpen, setIsProposalFilterOpen] = useState(false);

  // Legacy stats for backward compatibility
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Enhanced stats for new dashboard
  const { data: enhancedStats, isLoading: enhancedStatsLoading } = useQuery({
    queryKey: ["/api/dashboard/enhanced-stats"],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery<RecentRequest[]>({
    queryKey: ["/api/dashboard/recent-requests"],
  });

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const userRole = user?.role || 'analyst';
  
  // Show Quick Actions only for roles that can create proposals
  const showQuickActions = ['analyst', 'admin'].includes(userRole);

  // Toggle section visibility
  const toggleSection = (section: string) => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter proposals based on filters
  const filteredProposals = useMemo(() => {
    if (!recentRequests) return [];

    return recentRequests.filter(proposal => {
      // Company filter
      if (proposalFilters.selectedCompanies.length > 0) {
        const companyMatch = proposalFilters.selectedCompanies.includes(proposal.targetCompany || '');
        if (!companyMatch) return false;
      }

      // Risk level filter
      if (proposalFilters.selectedRiskLevels.length > 0) {
        const riskMatch = proposalFilters.selectedRiskLevels.includes(proposal.riskLevel || '');
        if (!riskMatch) return false;
      }

      // Investment type filter
      if (proposalFilters.selectedInvestmentTypes.length > 0) {
        const typeMatch = proposalFilters.selectedInvestmentTypes.includes(proposal.investmentType || '');
        if (!typeMatch) return false;
      }

      // Expected return filter
      if (proposalFilters.expectedReturnMode === 'range') {
        const expectedReturn = parseFloat(proposal.expectedReturn || '0');
        const [minReturn, maxReturn] = proposalFilters.expectedReturnRange;
        if (expectedReturn < minReturn || expectedReturn > maxReturn) return false;
      } else if (proposalFilters.expectedReturnSpecific) {
        const expectedReturn = parseFloat(proposal.expectedReturn || '0');
        const specificReturn = parseFloat(proposalFilters.expectedReturnSpecific);
        if (expectedReturn !== specificReturn) return false;
      }

      // Amount filter
      const amount = parseFloat(proposal.amount || '0');
      const [minAmount, maxAmount] = proposalFilters.amountRange;
      const userMinAmount = proposalFilters.amountMin ? parseFloat(proposalFilters.amountMin) : minAmount;
      const userMaxAmount = proposalFilters.amountMax ? parseFloat(proposalFilters.amountMax) : maxAmount;
      
      if (amount < userMinAmount || amount > userMaxAmount) return false;

      return true;
    });
  }, [recentRequests, proposalFilters]);

  // Get unique companies for filter dropdown
  const uniqueCompanies = useMemo(() => {
    if (!recentRequests) return [];
    const companies = recentRequests.map(r => r.targetCompany).filter(Boolean);
    return [...new Set(companies)];
  }, [recentRequests]);

  // Clear all filters
  const clearAllFilters = () => {
    setProposalFilters({
      selectedCompanies: [],
      selectedRiskLevels: [],
      selectedInvestmentTypes: [],
      expectedReturnMode: 'range',
      expectedReturnRange: [0, 50],
      expectedReturnSpecific: '',
      amountRange: [0, 10000000],
      amountMin: '',
      amountMax: ''
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (proposalFilters.selectedCompanies.length > 0) count++;
    if (proposalFilters.selectedRiskLevels.length > 0) count++;
    if (proposalFilters.selectedInvestmentTypes.length > 0) count++;
    if (proposalFilters.expectedReturnSpecific || (proposalFilters.expectedReturnRange[0] > 0 || proposalFilters.expectedReturnRange[1] < 50)) count++;
    if (proposalFilters.amountMin || proposalFilters.amountMax || (proposalFilters.amountRange[0] > 0 || proposalFilters.amountRange[1] < 10000000)) count++;
    return count;
  }, [proposalFilters]);

  if (statsLoading || enhancedStatsLoading || requestsLoading || tasksLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Overview Section */}
      <div id="overview" className="space-y-4">
        <Collapsible 
            open={!sectionsCollapsed.overview} 
            onOpenChange={() => toggleSection('overview')}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Overview</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToTop();
                    }}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </div>
                  {sectionsCollapsed.overview ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronUp className="h-4 w-4" />
                  }
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <StatsCard
                  title="My Pending Tasks"
                  value={stats?.pendingApprovals || 0}
                  icon={Clock}
                  color="primary"
                />
                <StatsCard
                  title="Active Investments"
                  value={stats?.activeInvestments || 0}
                  icon={Briefcase}
                  color="success"
                />
                <StatsCard
                  title="Cash Requests"
                  value={stats?.cashRequests || 0}
                  icon={DollarSign}
                  color="warning"
                />
                <StatsCard
                  title="SLA Issues"
                  value={stats?.slaBreaches || 0}
                  icon={AlertTriangle}
                  color="destructive"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Enhanced Dashboard Content */}
        {enhancedStats && (
          <div className="space-y-4">
            {/* Proposal Summary Section */}
            <div id="proposal-summary" className="space-y-4">
              <Collapsible 
                open={!sectionsCollapsed.proposalSummary} 
                onOpenChange={() => toggleSection('proposalSummary')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Proposal Summary</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToTop();
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </div>
                      {sectionsCollapsed.proposalSummary ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4">
                    <ProposalSummaryCard 
                      data={enhancedStats.proposalSummary} 
                      userRole={userRole}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Decision Support Section */}
            <div id="decision-support" className="space-y-4">
              <Collapsible 
                open={!sectionsCollapsed.decisionSupport} 
                onOpenChange={() => toggleSection('decisionSupport')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Decision Support</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToTop();
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </div>
                      {sectionsCollapsed.decisionSupport ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4">
                    <DecisionSupportWidget 
                      data={enhancedStats.decisionSupport} 
                      userRole={userRole}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Analytics Section */}
            <div id="analytics" className="space-y-4">
              <Collapsible 
                open={!sectionsCollapsed.analytics} 
                onOpenChange={() => toggleSection('analytics')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Analytics</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToTop();
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </div>
                      {sectionsCollapsed.analytics ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    <RiskProfileChart data={enhancedStats.riskProfile} />
                    <ValueDistributionChart data={enhancedStats.valueDistribution} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Proposals Section */}
            <div id="proposals" className="space-y-4">
              <Collapsible 
                open={!sectionsCollapsed.proposals} 
                onOpenChange={() => toggleSection('proposals')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Proposals</h3>
                      <Badge variant="outline" className="text-xs">
                        {filteredProposals.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToTop();
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </div>
                      {sectionsCollapsed.proposals ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Proposals</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsProposalFilterOpen(!isProposalFilterOpen)}
                            className="flex items-center gap-2"
                          >
                            <Filter className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                              <Badge variant="secondary" className="ml-1">
                                {activeFilterCount}
                              </Badge>
                            )}
                          </Button>
                          <Link href="/investments">
                            <Button variant="ghost" size="sm">
                              View All
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {/* Filter Panel */}
                    {isProposalFilterOpen && (
                      <div className="px-6 pb-4 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                          {/* Company Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Client/Company</label>
                            <Select 
                              value={proposalFilters.selectedCompanies.length > 0 ? proposalFilters.selectedCompanies[0] : "all"}
                              onValueChange={(value) => {
                                if (value === "all") {
                                  setProposalFilters(prev => ({ ...prev, selectedCompanies: [] }));
                                } else {
                                  setProposalFilters(prev => ({ ...prev, selectedCompanies: [value] }));
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select company" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Companies</SelectItem>
                                {uniqueCompanies.map(company => (
                                  <SelectItem key={company} value={company}>{company}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Risk Level Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Risk Level</label>
                            <div className="space-y-2">
                              {['low', 'medium', 'high'].map(level => (
                                <div key={level} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={level}
                                    checked={proposalFilters.selectedRiskLevels.includes(level)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setProposalFilters(prev => ({
                                          ...prev,
                                          selectedRiskLevels: [...prev.selectedRiskLevels, level]
                                        }));
                                      } else {
                                        setProposalFilters(prev => ({
                                          ...prev,
                                          selectedRiskLevels: prev.selectedRiskLevels.filter(l => l !== level)
                                        }));
                                      }
                                    }}
                                  />
                                  <label htmlFor={level} className="text-sm capitalize">{level}</label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Investment Type Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Investment Type</label>
                            <Select 
                              value={proposalFilters.selectedInvestmentTypes.length > 0 ? proposalFilters.selectedInvestmentTypes[0] : "all"}
                              onValueChange={(value) => {
                                if (value === "all") {
                                  setProposalFilters(prev => ({ ...prev, selectedInvestmentTypes: [] }));
                                } else {
                                  setProposalFilters(prev => ({ ...prev, selectedInvestmentTypes: [value] }));
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="equity">Equity</SelectItem>
                                <SelectItem value="debt">Debt</SelectItem>
                                <SelectItem value="real_estate">Real Estate</SelectItem>
                                <SelectItem value="alternative">Alternative</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Expected Returns Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Expected Returns (%)</label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={proposalFilters.expectedReturnMode === 'range'}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setProposalFilters(prev => ({ ...prev, expectedReturnMode: 'range' }));
                                    }
                                  }}
                                />
                                <label className="text-sm">Range</label>
                              </div>
                              {proposalFilters.expectedReturnMode === 'range' && (
                                <div className="px-3">
                                  <Slider
                                    value={proposalFilters.expectedReturnRange}
                                    onValueChange={(value) => setProposalFilters(prev => ({ ...prev, expectedReturnRange: value }))}
                                    max={50}
                                    min={0}
                                    step={1}
                                    className="w-full"
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{proposalFilters.expectedReturnRange[0]}%</span>
                                    <span>{proposalFilters.expectedReturnRange[1]}%</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={proposalFilters.expectedReturnMode === 'specific'}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setProposalFilters(prev => ({ ...prev, expectedReturnMode: 'specific' }));
                                    }
                                  }}
                                />
                                <label className="text-sm">Specific</label>
                              </div>
                              {proposalFilters.expectedReturnMode === 'specific' && (
                                <div className="px-3">
                                  <Input
                                    type="number"
                                    placeholder="Enter %"
                                    value={proposalFilters.expectedReturnSpecific}
                                    onChange={(e) => setProposalFilters(prev => ({ ...prev, expectedReturnSpecific: e.target.value }))}
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Amount Filter */}
                          <div>
                            <label className="text-sm font-medium mb-2 block">Amount Range</label>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  value={proposalFilters.amountMin}
                                  onChange={(e) => setProposalFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                                />
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  value={proposalFilters.amountMax}
                                  onChange={(e) => setProposalFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Clear Filters */}
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearAllFilters}
                              className="w-full"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear All
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <CardContent>
                      <RequestsTable requests={filteredProposals} />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Quick Actions Section */}
            {showQuickActions && (
              <div id="quick-actions" className="space-y-4">
                <Collapsible 
                  open={!sectionsCollapsed.quickActions} 
                  onOpenChange={() => toggleSection('quickActions')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Quick Actions</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToTop();
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </div>
                        {sectionsCollapsed.quickActions ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronUp className="h-4 w-4" />
                        }
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Link href="/new-investment">
                          <Button className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Investment Request
                          </Button>
                        </Link>
                        <Link href="/cash-requests">
                          <Button variant="outline" className="w-full justify-start">
                            <DollarSign className="mr-2 h-4 w-4" />
                            New Cash Request
                          </Button>
                        </Link>
                        <Link href="/templates">
                          <Button variant="ghost" className="w-full justify-start">
                            <FileText className="mr-2 h-4 w-4" />
                            Use Template
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* My Tasks Section */}
            <div id="tasks" className="space-y-4">
              <Collapsible 
                open={!sectionsCollapsed.tasks} 
                onOpenChange={() => toggleSection('tasks')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">My Tasks</h3>
                      <Badge variant="outline" className="text-xs">
                        {myTasks?.length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="hover:bg-accent rounded-sm p-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToTop();
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </div>
                      {sectionsCollapsed.tasks ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>My Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskList tasks={myTasks || []} />
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        )}
    </div>
  );
}
