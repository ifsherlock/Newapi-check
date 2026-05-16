import { useState } from 'react';
import { X } from 'lucide-react';

const empty = { name: '', base_url: '', login_type: 'password', username: '', password: '', session_token: '', new_api_user: '', quota_unit: '', checkin_mode: 'auto' };

export default function AddAccountModal({ account, onClose, onSave }) {
  const [form, setForm] = useState(account ? { ...empty, ...account, password: '', session_token: '' } : { ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{account ? '编辑账号' : '添加账号'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="glass-input" placeholder="账号名称" value={form.name} onChange={e => set('name', e.target.value)} required />
          <input className="glass-input" placeholder="站点地址 (https://...)" value={form.base_url} onChange={e => set('base_url', e.target.value)} required />
          <div className="text-xs text-gray-400 dark:text-gray-400">
            建议填写域名根地址，例如 https://example.com（不要包含 /console 等路径）
          </div>

          <select className="glass-select" value={form.login_type} onChange={e => set('login_type', e.target.value)}>
            <option value="password">密码登录</option>
            <option value="session">Session Token</option>
          </select>

          {form.login_type === 'password' ? (
            <>
              <input
                className="glass-input"
                placeholder="用户名"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                required={!account}
              />
              <input
                className="glass-input"
                type="password"
                placeholder={account ? '密码 (留空不修改)' : '密码'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required={!account}
              />
            </>
          ) : (
            <>
              <input
                className="glass-input"
                type="password"
                placeholder={account ? 'Session Token (留空不修改)' : 'Session Token'}
                value={form.session_token}
                onChange={e => set('session_token', e.target.value)}
                required={!account}
              />
            </>
          )}

          {/* New-Api-User field - shown for ALL login types */}
          <input
            className="glass-input"
            placeholder="New-Api-User (可选，用户ID)"
            value={form.new_api_user}
            onChange={e => set('new_api_user', e.target.value)}
          />
          <div className="text-xs text-gray-400 dark:text-gray-400">
            部分站点需要该值才能正常签到。可在浏览器 Network → /api/user/self → Request Headers 中查看
          </div>

          {/* Checkin Mode - per account */}
          <div className="pt-2 border-t border-gray-200/50 dark:border-gray-600/30">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 block">签到模式</label>
            <select className="glass-select" value={form.checkin_mode || 'auto'} onChange={e => set('checkin_mode', e.target.value)}>
              <option value="auto">自动（先API后浏览器）</option>
              <option value="api">仅直接 API</option>
              <option value="browser">仅浏览器模式</option>
              <option value="browser_turnstile">浏览器 + Turnstile 绕过</option>
            </select>
            <div className="text-xs text-gray-400 dark:text-gray-400 mt-1">
              自动：先尝试直接 API 签到，失败后回退浏览器<br/>
              仅 API：只用直接 API 请求签到<br/>
              浏览器：使用 Puppeteer 模拟浏览器签到<br/>
              浏览器 + Turnstile：加载绕过扩展，自动处理 Cloudflare Turnstile 验证
            </div>
          </div>

          <input
            className="glass-input"
            placeholder="余额单位系数 (可选，例如 500000)"
            value={form.quota_unit}
            onChange={e => set('quota_unit', e.target.value)}
          />
          <div className="text-xs text-gray-400 dark:text-gray-400">
            若余额显示过大，可填 500000
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="glass-button-primary flex-1">
              {saving ? '保存中...' : '保存'}
            </button>
            <button type="button" onClick={onClose} className="glass-button flex-1">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
}
