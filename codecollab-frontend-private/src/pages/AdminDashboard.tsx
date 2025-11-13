import { useEffect, useState } from "react";
import { listAdminUsers, listAdminExecutions, getAdminMetrics, listRolesAdmin, createRoleAdmin, assignUserRoleAdmin } from "@/services/adminService";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [tab, setTab] = useState<'users'|'executions'|'metrics'|'roles'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [execs, setExecs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any|null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [assign, setAssign] = useState({ userId: '', roleId: '' });

  useEffect(() => {
    if (tab === 'users') listAdminUsers().then((r: any) => setUsers((r?.data ?? r) || [])).catch(()=>{});
    if (tab === 'executions') listAdminExecutions().then((r: any) => setExecs((r?.data ?? r) || [])).catch(()=>{});
    if (tab === 'metrics') getAdminMetrics().then((r: any) => setMetrics((r?.data ?? r) || null)).catch(()=>{});
    if (tab === 'roles') listRolesAdmin().then((r: any) => setRoles((r?.data ?? r) || [])).catch(()=>{});
  }, [tab]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <div className="flex gap-2">
        <Button size="sm" variant={tab==='users'?'default':'outline'} onClick={()=>setTab('users')}>Users</Button>
        <Button size="sm" variant={tab==='executions'?'default':'outline'} onClick={()=>setTab('executions')}>Executions</Button>
        <Button size="sm" variant={tab==='metrics'?'default':'outline'} onClick={()=>setTab('metrics')}>Metrics</Button>
        <Button size="sm" variant={tab==='roles'?'default':'outline'} onClick={()=>setTab('roles')}>Roles</Button>
      </div>

      {tab === 'users' && (
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-2">Username</th>
                <th className="p-2">Email</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.plan}</td>
                  <td className="p-2 space-x-2">
                    <select className="border rounded px-2 py-1 text-xs" value={assign.userId===u.id?assign.roleId:''} onChange={(e)=>setAssign({ userId: u.id, roleId: e.target.value })}>
                      <option value="">Select role</option>
                      {roles.map((r)=> <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <Button size="sm" onClick={()=>{ if(assign.userId===u.id && assign.roleId){ assignUserRoleAdmin(u.id, assign.roleId).then(()=>{}).catch(()=>{}); } }}>Assign</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'executions' && (
        <div className="border rounded overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-2">ID</th>
                <th className="p-2">User</th>
                <th className="p-2">Room</th>
                <th className="p-2">Lang</th>
                <th className="p-2">Status</th>
                <th className="p-2">Time (ms)</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {execs.map((e)=> (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.id.slice(0,8)}</td>
                  <td className="p-2">{e.user?.username}</td>
                  <td className="p-2">{e.roomId?.slice?.(0,8)}</td>
                  <td className="p-2">{e.language}</td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2">{e.execTimeMs}</td>
                  <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'metrics' && metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics).map(([k,v])=> (
            <div key={k} className="border rounded p-4">
              <div className="text-sm text-muted-foreground">{k}</div>
              <div className="text-2xl font-semibold">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm">New Role</label>
              <input className="w-full border rounded px-2 py-1 text-sm bg-background" placeholder="Name" value={newRole.name} onChange={(e)=>setNewRole((n)=>({...n, name: e.target.value}))} />
              <input className="w-full border rounded px-2 py-1 text-sm mt-1 bg-background" placeholder="Description" value={newRole.description} onChange={(e)=>setNewRole((n)=>({...n, description: e.target.value}))} />
            </div>
            <Button size="sm" onClick={()=>{ if(newRole.name) createRoleAdmin(newRole).then(()=> listRolesAdmin().then((r:any)=>setRoles((r?.data??r)||[]))).catch(()=>{}); }}>Create</Button>
          </div>
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2">Name</th>
                  <th className="p-2">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r)=> (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-xs text-muted-foreground">{(r.rolePermissions||[]).map((rp:any)=> `${rp.permission.action}:${rp.permission.resource}`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
