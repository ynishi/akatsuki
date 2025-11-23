import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { useWasmModule } from '../../hooks/useWasmModule'
import { WasmModuleUploader } from '../../components/wasm/WasmModuleUploader'
import { WasmModuleList } from '../../components/wasm/WasmModuleList'

export function WasmModuleAdminPage() {
  const { user } = useAuth()
  const {
    systemModules,
    adminModules,
    ownModules,
    isLoadingSystemModules,
    isLoadingAdminModules,
    isLoadingOwnModules,
    refetchSystemModules,
    refetchAdminModules,
    refetchOwnModules,
  } = useWasmModule()

  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'system' | 'admin' | 'user'>('system')

  const handleUploadSuccess = () => {
    setUploaderOpen(false)
    // Refetch appropriate modules based on current tab
    if (selectedTab === 'system') refetchSystemModules()
    if (selectedTab === 'admin') refetchAdminModules()
    if (selectedTab === 'user') refetchOwnModules()
  }

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
            WASM Module Management
          </h1>
          <p className="text-gray-600 mt-2">Manage WebAssembly modules with system/admin/user categorization</p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setUploaderOpen(true)}
        >
          Upload Module
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{systemModules?.length || 0}</div>
            <p className="text-xs text-gray-600">System Modules</p>
            <Badge variant="default" className="mt-2">Public</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{adminModules?.length || 0}</div>
            <p className="text-xs text-gray-600">Admin Modules</p>
            <Badge variant="destructive" className="mt-2">Admin Only</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{ownModules?.length || 0}</div>
            <p className="text-xs text-gray-600">User Modules</p>
            <Badge variant="secondary" className="mt-2">Private/Public</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {((systemModules?.length || 0) + (adminModules?.length || 0) + (ownModules?.length || 0))}
            </div>
            <p className="text-xs text-gray-600">Total Modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">
            System Modules
            <Badge variant="outline" className="ml-2">{systemModules?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="admin">
            Admin Modules
            <Badge variant="outline" className="ml-2">{adminModules?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="user">
            User Modules
            <Badge variant="outline" className="ml-2">{ownModules?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Modules</CardTitle>
              <CardDescription>
                System modules are available to all authenticated users. These are core modules maintained by administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasmModuleList
                modules={systemModules || []}
                isLoading={isLoadingSystemModules}
                onRefresh={refetchSystemModules}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Modules</CardTitle>
              <CardDescription>
                Admin-only modules. These modules can only be executed by administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasmModuleList
                modules={adminModules || []}
                isLoading={isLoadingAdminModules}
                onRefresh={refetchAdminModules}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Modules</CardTitle>
              <CardDescription>
                Your personal modules. You can make them public or keep them private.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasmModuleList
                modules={ownModules || []}
                isLoading={isLoadingOwnModules}
                onRefresh={refetchOwnModules}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <WasmModuleUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onSuccess={handleUploadSuccess}
        defaultOwnerType={selectedTab}
      />
    </div>
  )
}
