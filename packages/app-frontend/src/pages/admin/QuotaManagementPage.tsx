import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { UserQuotaRepository, PlanType } from '../../repositories'
import { useAuth } from '../../contexts/AuthContext'

interface UserData {
  id: string
  user_id: string
  plan_type: PlanType
  monthly_request_limit: number
  requests_used: number
  user?: {
    email?: string
    username?: string
  }
}

interface EditForm {
  planType: PlanType
  monthlyLimit: number | string
  requestsUsed: number | string
}

export function QuotaManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  // Form states
  const [editForm, setEditForm] = useState<EditForm>({
    planType: 'free',
    monthlyLimit: 100,
    requestsUsed: 0,
  })

  // Load all users with quota
  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await UserQuotaRepository.getAllUsersWithQuota()
      setUsers(data as UserData[])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to load users:', error)
      alert(`Failed to load users: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Open edit dialog
  const handleEdit = (userData: UserData) => {
    setSelectedUser(userData)
    setEditForm({
      planType: userData.plan_type,
      monthlyLimit: userData.monthly_request_limit,
      requestsUsed: userData.requests_used,
    })
    setEditDialogOpen(true)
  }

  // Save changes
  const handleSave = async () => {
    if (!selectedUser) return

    try {
      // Update plan type
      if (editForm.planType !== selectedUser.plan_type) {
        await UserQuotaRepository.updatePlanType(selectedUser.user_id, editForm.planType)
      }

      // Update limit
      if (Number(editForm.monthlyLimit) !== selectedUser.monthly_request_limit) {
        await UserQuotaRepository.updateQuotaLimit(selectedUser.user_id, parseInt(String(editForm.monthlyLimit)))
      }

      // Reset usage if changed
      if (Number(editForm.requestsUsed) !== selectedUser.requests_used) {
        await UserQuotaRepository.upsertQuota(selectedUser.user_id, {
          plan_type: editForm.planType,
          monthly_request_limit: parseInt(String(editForm.monthlyLimit)),
          requests_used: parseInt(String(editForm.requestsUsed)),
        })
      }

      alert('Quota updated successfully!')
      setEditDialogOpen(false)
      await loadUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Update error:', error)
      alert(`Error: ${errorMessage}`)
    }
  }

  // Reset usage
  const handleResetUsage = async (userData: UserData) => {
    if (!confirm(`Reset usage for ${userData.user?.email || userData.user?.username || 'this user'}?`)) return

    try {
      await UserQuotaRepository.resetUsageCount(userData.user_id)
      alert('Usage reset successfully!')
      await loadUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Reset error:', error)
      alert(`Error: ${errorMessage}`)
    }
  }

  // Quick plan change
  const handleQuickPlanChange = async (userData: UserData, newPlan: PlanType) => {
    try {
      await UserQuotaRepository.updatePlanType(userData.user_id, newPlan)

      // Auto-adjust limit based on plan
      const limits: Record<PlanType, number> = { free: 100, pro: 1000, enterprise: 10000 }
      await UserQuotaRepository.updateQuotaLimit(userData.user_id, limits[newPlan])

      await loadUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Plan change error:', error)
      alert(`Error: ${errorMessage}`)
    }
  }

  // Filter users
  const filteredUsers = users.filter(userData => {
    const matchesSearch = !searchQuery ||
      (userData.user?.email && userData.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (userData.user?.username && userData.user.username.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesPlan = planFilter === 'all' || userData.plan_type === planFilter
    return matchesSearch && matchesPlan
  })

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    freeUsers: users.filter(u => u.plan_type === 'free').length,
    proUsers: users.filter(u => u.plan_type === 'pro').length,
    enterpriseUsers: users.filter(u => u.plan_type === 'enterprise').length,
    totalRequests: users.reduce((sum, u) => sum + u.requests_used, 0),
    avgUsage: users.length > 0
      ? (users.reduce((sum, u) => sum + (u.requests_used / u.monthly_request_limit * 100), 0) / users.length).toFixed(1)
      : '0',
  }

  // Get plan badge variant
  const getPlanBadge = (plan: string) => {
    const variants: Record<string, any> = {
      free: 'secondary',
      pro: 'default',
      enterprise: 'gradient',
    }
    return variants[plan] || 'outline'
  }

  // Get usage color
  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100
    if (percentage >= 90) return 'text-red-600 font-bold'
    if (percentage >= 70) return 'text-orange-600'
    return 'text-gray-900'
  }

  useEffect(() => {
    loadUsers()
  }, [])

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to access the admin panel.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
              LLM Quota Management
            </h1>
            <p className="text-gray-600 mt-2">Manage user API quotas and limits</p>
          </div>
          <Button
            variant="gradient"
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-gray-600">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.freeUsers}</div>
              <p className="text-xs text-gray-600">Free Plan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.proUsers}</div>
              <p className="text-xs text-gray-600">Pro Plan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.enterpriseUsers}</div>
              <p className="text-xs text-gray-600">Enterprise</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-gray-600">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avgUsage}%</div>
              <p className="text-xs text-gray-600">Avg Usage</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Click on a user to edit quota settings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users found</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((userData) => (
                  <div
                    key={userData.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {userData.user?.email || userData.user?.username || `User ${userData.user_id.substring(0, 8)}`}
                        </span>
                        <Badge variant={getPlanBadge(userData.plan_type)}>
                          {userData.plan_type}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Usage:</span>{' '}
                          <span className={getUsageColor(userData.requests_used, userData.monthly_request_limit)}>
                            {userData.requests_used} / {userData.monthly_request_limit}
                          </span>
                          {' '}
                          <span className="text-gray-500">
                            ({((userData.requests_used / userData.monthly_request_limit) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Remaining:</span>{' '}
                          {userData.monthly_request_limit - userData.requests_used}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={userData.plan_type}
                        onValueChange={(val) => handleQuickPlanChange(userData, val as PlanType)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetUsage(userData)}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleEdit(userData)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Quota: {selectedUser?.user?.email || selectedUser?.user?.username || 'User'}
              </DialogTitle>
              <DialogDescription>
                Update user quota settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Plan Type</label>
                <Select value={editForm.planType} onValueChange={(val) => setEditForm({ ...editForm, planType: val as PlanType })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (100 requests/month)</SelectItem>
                    <SelectItem value="pro">Pro (1,000 requests/month)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (10,000 requests/month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Monthly Limit</label>
                <Input
                  type="number"
                  value={editForm.monthlyLimit}
                  onChange={(e) => setEditForm({ ...editForm, monthlyLimit: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Requests Used (Current Month)</label>
                <Input
                  type="number"
                  value={editForm.requestsUsed}
                  onChange={(e) => setEditForm({ ...editForm, requestsUsed: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 to reset usage</p>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}
