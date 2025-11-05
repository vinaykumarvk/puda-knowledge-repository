import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Briefcase, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Eye, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  FileText,
  User
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { InvestmentDetailsInline } from "@/components/details/InvestmentDetailsInline";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Filter interfaces
interface InvestmentFilters {
  searchReportCode: string;
  selectedCompanies: string[];
  selectedReportTypes: string[];
}

export default function MyInvestments() {
  const [expandedInvestment, setExpandedInvestment] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter state
  const [filters, setFilters] = useState<InvestmentFilters>({
    searchReportCode: '',
    selectedCompanies: [],
    selectedReportTypes: [],
  });

  const { data: investments, isLoading } = useQuery({
    queryKey: ["/api/investments"],
  });

  const handleToggleDetails = (investmentId: number) => {
    setExpandedInvestment(expandedInvestment === investmentId ? null : investmentId);
  };

  // Extract unique values for filter options
  const uniqueCompanies = useMemo(() => {
    return [...new Set(investments?.map((inv: any) => inv.targetCompany) || [])].sort();
  }, [investments]);

  const uniqueReportTypes = useMemo(() => {
    return [...new Set(investments?.map((inv: any) => inv.investmentType) || [])].sort();
  }, [investments]);

  // Filter investments based on current filters
  const filteredInvestments = useMemo(() => {
    if (!investments) return [];
    
    return investments.filter((inv: any) => {
      // Search by Report Code filter
      if (filters.searchReportCode.trim()) {
        const searchTerm = filters.searchReportCode.toLowerCase();
        const reportCodeMatch = inv.reportCode && inv.reportCode.toLowerCase().includes(searchTerm);
        const requestIdMatch = inv.requestId && inv.requestId.toLowerCase().includes(searchTerm);
        if (!reportCodeMatch && !requestIdMatch) {
          return false;
        }
      }
      
      // Company/Subject filter
      if (filters.selectedCompanies.length > 0 && !filters.selectedCompanies.includes(inv.targetCompany)) {
        return false;
      }
      
      // Report type filter
      if (filters.selectedReportTypes.length > 0 && !filters.selectedReportTypes.includes(inv.investmentType)) {
        return false;
      }
      
      return true;
    });
  }, [investments, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchReportCode: '',
      selectedCompanies: [],
      selectedReportTypes: [],
    });
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchReportCode.trim()) count++;
    if (filters.selectedCompanies.length > 0) count++;
    if (filters.selectedReportTypes.length > 0) count++;
    return count;
  }, [filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4" />;
      case 'changes_requested':
        return <Eye className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter logic based on actual approval states - now using filtered investments
  const pendingInvestments = filteredInvestments?.filter((inv: any) => {
    // Pending means not fully approved and not rejected
    const status = inv.status.toLowerCase();
    return !status.includes('approved') && !status.includes('rejected') && status !== 'approved';
  }) || [];
  
  const approvedInvestments = filteredInvestments?.filter((inv: any) => {
    // Approved means final approval status (only "approved", not partial approvals)
    return inv.status.toLowerCase() === 'approved';
  }) || [];
  
  const rejectedInvestments = filteredInvestments?.filter((inv: any) => {
    // Rejected by any approver
    const status = inv.status.toLowerCase();
    return status === 'rejected' || status.includes('rejected');
  }) || [];

  return (
    <div className="w-full h-full pl-6 py-6">
      <div className="w-full mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">My Reports</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <CollapsibleContent>
            <Card className="mb-4 p-4 border-2 border-dashed border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Search by Report Code */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Search by Report Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter Report Code (e.g., RPT-2025-001)"
                    value={filters.searchReportCode}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchReportCode: e.target.value }))}
                    className="w-full"
                  />
                </div>
                
                {/* Company/Subject Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subject / Client Name</Label>
                  <Select 
                    value={filters.selectedCompanies.length > 0 ? filters.selectedCompanies[0] : "all"} 
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        selectedCompanies: value === "all" ? [] : [value] 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject/client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects/Clients</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Report Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Report Type</Label>
                  <Select 
                    value={filters.selectedReportTypes.length > 0 ? filters.selectedReportTypes[0] : "all"} 
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        selectedReportTypes: value === "all" ? [] : [value] 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueReportTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                    disabled={activeFilterCount === 0}
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Investment counts */}
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span>{filteredInvestments.length} total</span>
          <span>{pendingInvestments.length} pending</span>
          <span>{approvedInvestments.length} approved</span>
          <span>{rejectedInvestments.length} rejected</span>
          {activeFilterCount > 0 && (
            <span className="text-blue-600 font-medium">
              ({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied)
            </span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({filteredInvestments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingInvestments.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedInvestments.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedInvestments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <InvestmentList investments={filteredInvestments || []} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <InvestmentList investments={pendingInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <InvestmentList investments={approvedInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <InvestmentList investments={rejectedInvestments} onToggleDetails={handleToggleDetails} expandedInvestment={expandedInvestment} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvestmentList({ investments, onToggleDetails, expandedInvestment }: { 
  investments: any[], 
  onToggleDetails: (id: number) => void, 
  expandedInvestment: number | null 
}) {
  const { toast } = useToast();

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (investmentId: number) => {
      const response = await apiRequest('DELETE', `/api/investments/${investmentId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete investment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({
        title: "Investment deleted",
        description: "The investment request has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete investment",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const canDeleteInvestment = (status: string) => {
    const deletableStatuses = ['draft', 'rejected', 'admin_rejected', 'changes_requested', 'opportunity', 'Draft'];
    return deletableStatuses.includes(status);
  };

  const handleDeleteInvestment = (investmentId: number) => {
    deleteInvestmentMutation.mutate(investmentId);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'opportunity':
        return 'bg-purple-100 text-purple-800';
      case 'New':
      case 'Modified':
        return 'bg-blue-100 text-blue-800';
      case 'Admin approved':
      case 'Manager approved':
      case 'Committee approved':
      case 'Finance approved':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'admin_rejected':
      case 'Manager rejected':
      case 'Committee rejected':
      case 'Finance rejected':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (investments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No investments found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {investments.map((investment) => (
        <Card key={investment.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{investment.reportTitle || investment.targetCompany}</h3>
                  </div>
                  <Badge className={getStatusColor(investment.status)}>
                    {investment.status}
                  </Badge>
                </div>
                
                {/* Report metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1 font-semibold text-blue-600">
                    <span>Report Code:</span>
                    <span>{investment.reportCode}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <span>Request ID:</span>
                    <span className="font-medium">{investment.requestId}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-purple-600">
                    <span>Type:</span>
                    <span className="capitalize">{investment.investmentType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Subject</span>
                      <span className="text-sm font-semibold">{investment.targetCompany}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Author</span>
                      <span className="text-sm font-semibold">{investment.createdBy || 'Anonymous'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Created</span>
                      <span className="text-sm font-semibold">{format(new Date(investment.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Documents</span>
                      <span className="text-sm font-semibold">{investment.documentCount || 0}</span>
                    </div>
                  </div>
                </div>
                
                {investment.description && (
                  <p className="text-sm text-gray-600 mb-4">{investment.description}</p>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {canDeleteInvestment(investment.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="w-10 h-10 p-0"
                        disabled={deleteInvestmentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Investment Request</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this investment request for {investment.targetCompany}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteInvestment(investment.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            
            <InvestmentDetailsInline
              investment={investment}
              isExpanded={expandedInvestment === investment.id}
              onToggle={() => onToggleDetails(investment.id)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
