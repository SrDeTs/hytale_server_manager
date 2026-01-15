import { useState } from 'react';
import { useChartTheme } from '../../hooks/useChartTheme';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input, Modal } from '../../components/ui';
import { Coins, TrendingUp, DollarSign, ShoppingBag, Plus, Edit, Trash2 } from 'lucide-react';
import { mockEconomyStats, mockShops } from '../../data/mockAdvanced';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const EconomyPage = () => {
  const chartTheme = useChartTheme();
  const stats = mockEconomyStats;
  const [shops, setShops] = useState(mockShops);
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);

  // Mock transaction history data
  const transactionHistory = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    volume: Math.floor(Math.random() * 50000 + 100000),
    transactions: Math.floor(Math.random() * 200 + 400),
  }));

  const handleCreateShop = () => {
    setIsCreateShopOpen(false);
  };

  const handleDeleteShop = (shopId: string) => {
    if (confirm('Are you sure you want to delete this shop?')) {
      setShops(shops.filter(s => s.id !== shopId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">Economy Management</h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">Manage server economy, shops, and transactions</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setIsCreateShopOpen(true)}>
          Create Shop
        </Button>
      </div>

      {/* Economy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Total Currency</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                ${stats.totalCurrency.toLocaleString()}
              </p>
            </div>
            <Coins size={32} className="text-warning" />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Average Balance</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                ${stats.averageBalance.toLocaleString()}
              </p>
            </div>
            <DollarSign size={32} className="text-success" />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Daily Volume</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                ${stats.transactionVolume.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={14} className="text-success" />
                <span className="text-xs text-success">+12.5%</span>
              </div>
            </div>
            <TrendingUp size={32} className="text-accent-primary" />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Active Shops</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {shops.length}
              </p>
            </div>
            <ShoppingBag size={32} className="text-accent-secondary" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Transaction Volume (7 Days)</CardTitle>
            <CardDescription>Daily transaction volume in currency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={transactionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="day" stroke={chartTheme.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: chartTheme.tooltipLabel }}
                />
                <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} dot={false} name="Volume ($)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Transaction Count (7 Days)</CardTitle>
            <CardDescription>Number of transactions per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={transactionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="day" stroke={chartTheme.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: '0.5rem' }}
                  labelStyle={{ color: chartTheme.tooltipLabel }}
                />
                <Bar dataKey="transactions" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Balance */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Richest Player</CardTitle>
          <CardDescription>Player with the highest account balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-primary-bg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-black bg-warning text-2xl">
                1
              </div>
              <div>
                <p className="text-text-light-primary dark:text-text-primary font-medium text-lg">{stats.richestPlayer.username}</p>
                <p className="text-xs text-text-light-muted dark:text-text-muted">{stats.richestPlayer.uuid}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-heading font-bold text-success">
                ${stats.richestPlayer.balance.toLocaleString()}
              </p>
              <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">Current balance</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-white dark:bg-primary-bg text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Median Balance</p>
              <p className="text-xl font-heading font-bold text-text-light-primary dark:text-text-primary">${stats.medianBalance.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-primary-bg text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Recent Transactions</p>
              <p className="text-xl font-heading font-bold text-text-light-primary dark:text-text-primary">{stats.recentTransactions.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shops */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Server Shops</CardTitle>
          <CardDescription>Manage in-game shops and inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <div key={shop.id} className="p-4 rounded-lg border border-gray-300 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-text-light-primary dark:text-text-primary">{shop.name}</h3>
                    <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">In-game shop with {shop.items.length} items</p>
                  </div>
                  <Badge variant="success" size="sm">
                    Active
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-light-muted dark:text-text-muted">Items</span>
                    <span className="text-text-light-primary dark:text-text-primary font-medium">{shop.items.length}</span>
                  </div>
                  {shop.location && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-light-muted dark:text-text-muted">Location</span>
                      <span className="text-text-light-primary dark:text-text-primary font-mono text-xs">
                        {shop.location.x}, {shop.location.y}, {shop.location.z}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-light-muted dark:text-text-muted">Owner</span>
                    <span className="text-text-light-primary dark:text-text-primary">{shop.owner}</span>
                  </div>
                </div>

                {/* Sample Items */}
                <div className="mb-4">
                  <p className="text-xs text-text-light-muted dark:text-text-muted mb-2">Sample Items:</p>
                  <div className="space-y-1">
                    {shop.items.slice(0, 3).map((item) => (
                      <div key={item.itemId} className="flex items-center justify-between text-sm p-2 rounded bg-white dark:bg-primary-bg">
                        <span className="text-text-light-primary dark:text-text-primary">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          {item.buyPrice && (
                            <Badge variant="success" size="sm">
                              Buy: ${item.buyPrice}
                            </Badge>
                          )}
                          {item.sellPrice && (
                            <Badge variant="info" size="sm">
                              Sell: ${item.sellPrice}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {shop.items.length > 3 && (
                      <p className="text-xs text-text-light-muted dark:text-text-muted text-center pt-1">
                        +{shop.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={<Edit size={14} />} className="flex-1">
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDeleteShop(shop.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Shop Modal */}
      <Modal isOpen={isCreateShopOpen} onClose={() => setIsCreateShopOpen(false)}>
        <div className="p-6">
          <h2 className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary mb-4">Create Shop</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Shop Name</label>
              <Input placeholder="e.g., General Store" />
            </div>
            <div>
              <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Description</label>
              <Input placeholder="e.g., Buy and sell general items" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">X Coordinate</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Y Coordinate</label>
                <Input type="number" placeholder="64" />
              </div>
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Z Coordinate</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">World</label>
              <Input placeholder="e.g., Orbis" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="ghost" onClick={() => setIsCreateShopOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateShop} className="flex-1">
                Create Shop
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
