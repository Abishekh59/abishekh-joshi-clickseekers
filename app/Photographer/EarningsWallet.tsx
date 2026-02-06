import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EarningsWallet {
  onBack?: () => void;
}

export default function EarningsWallet({ onBack }: EarningsWallet) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'withdraw'>('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [accountDetails, setAccountDetails] = useState('');

  const {
    primary,
    secondary,
    background,
    gray900,
    gray700,
    gray600,
    gray500,
    gray400,
    gray300,
    gray200,
    gray100,
    white,
    success,
    warning,
    error: errorColor,
    info
  } = useAppTheme();

  const stats = {
    totalEarnings: 125000,
    thisMonth: 35000,
    availableBalance: 28000,
    pendingPayments: 12000
  };

  const transactions = [
    { id: 1, client: 'Sita Sharma', amount: 40000, status: 'completed', date: '2024-12-15', type: 'income' },
    { id: 2, client: 'Ram Thapa', amount: 25000, status: 'completed', date: '2024-12-10', type: 'income' },
    { id: 3, type: 'withdrawal', amount: -30000, status: 'completed', date: '2024-12-05', bankAccount: 'XXX-1234' },
    { id: 4, client: 'Maya Gurung', amount: 25000, status: 'pending', date: '2025-01-22', type: 'income' }
  ];

  const monthlyEarnings = [
    { month: 'Aug', amount: 45000 },
    { month: 'Sep', amount: 52000 },
    { month: 'Oct', amount: 48000 },
    { month: 'Nov', amount: 55000 },
    { month: 'Dec', amount: 35000 }
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US');
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : insets.top + 16, backgroundColor: primary }]}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          )}
          <ThemedText type="xl" weight="semibold" style={{ color: 'white' }}>
            Earnings & Wallet
          </ThemedText>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <ThemedText type="sm" style={{ color: '#bfdbfe', marginBottom: 8 }}>
            Available Balance
          </ThemedText>
          <ThemedText type="3xl" weight="bold" style={{ color: 'white', marginBottom: 12 }}>
            NPR {formatAmount(stats.availableBalance)}
          </ThemedText>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setActiveTab('withdraw')}
          >
            <ThemedText type="sm" weight="semibold" style={{ color: primary }}>
              Withdraw Funds
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: background }]}>
        {(['overview', 'transactions', 'withdraw'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { borderBottomColor: primary }
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              type="sm"
              weight={activeTab === tab ? 'semibold' : 'medium'}
              style={{ color: activeTab === tab ? primary : gray500 }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: background }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="wallet" size={20} color="#059669" />
                  <ThemedText type="xs" style={{ color: gray600, flex: 1 }}>
                    Total Earnings
                  </ThemedText>
                </View>
                <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
                  NPR {formatAmount(stats.totalEarnings)}
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: background }]}>
                <View style={styles.statHeader}>
                  <Ionicons name="trending-up" size={20} color={primary} />
                  <ThemedText type="xs" style={{ color: gray600, flex: 1 }}>
                    This Month
                  </ThemedText>
                </View>
                <ThemedText type="lg" weight="bold" style={{ color: gray900 }}>
                  NPR {formatAmount(stats.thisMonth)}
                </ThemedText>
              </View>
            </View>

            {/* Chart */}
            <View style={[styles.chartCard, { backgroundColor: background }]}>
              <ThemedText type="base" weight="semibold" style={{ color: gray900, marginBottom: 12 }}>
                Monthly Earnings
              </ThemedText>
              <View style={styles.chartBars}>
                {monthlyEarnings.map((data, index) => (
                  <View key={index} style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${(data.amount / 60000) * 100}%`, backgroundColor: '#dbeafe' }
                      ]}
                    >
                      <ThemedText type="xs" weight="medium" style={{ color: gray600, position: 'absolute', top: -20, textAlign: 'center', width: '100%' }}>
                        {(data.amount / 1000).toFixed(0)}k
                      </ThemedText>
                    </View>
                    <ThemedText type="xs" style={{ color: gray600 }}>
                      {data.month}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Pending Payments */}
            <View style={[styles.pendingCard, { backgroundColor: background }]}>
              <View style={styles.pendingHeader}>
                <ThemedText type="base" weight="semibold" style={{ color: gray900 }}>
                  Pending Payments
                </ThemedText>
                <ThemedText type="base" weight="semibold" style={{ color: secondary }}>
                  NPR {formatAmount(stats.pendingPayments)}
                </ThemedText>
              </View>
              <ThemedText type="xs" style={{ color: gray600 }}>
                Payment will be released after booking completion
              </ThemedText>
            </View>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item: transaction }) => (
              <View style={[styles.transactionCard, { backgroundColor: background }]}>
                <View style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: transaction.type === 'income' ? '#d1fae5' : '#fee2e2' }
                      ]}
                    >
                      <Ionicons
                        name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={20}
                        color={transaction.type === 'income' ? '#059669' : errorColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="sm" weight="medium" style={{ color: gray900 }}>
                        {transaction.type === 'income'
                          ? `Payment from ${transaction.client}`
                          : 'Withdrawal to bank'}
                      </ThemedText>
                      <ThemedText type="xs" style={{ color: gray500, marginTop: 2 }}>
                        {new Date(transaction.date).toLocaleDateString()}
                      </ThemedText>
                      {transaction.bankAccount && (
                        <ThemedText type="xs" style={{ color: gray400, marginTop: 2 }}>
                          Account: {transaction.bankAccount}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <ThemedText
                      type="sm"
                      weight="semibold"
                      style={{ color: transaction.type === 'income' ? '#059669' : errorColor }}
                    >
                      {transaction.type === 'income' ? '+' : ''}NPR {Math.abs(transaction.amount).toLocaleString()}
                    </ThemedText>
                    <View
                      style={[
                        styles.transactionStatus,
                        { backgroundColor: transaction.status === 'completed' ? '#d1fae5' : '#fef3c7' }
                      ]}
                    >
                      <ThemedText
                        type="xs"
                        weight="medium"
                        style={{
                          color: transaction.status === 'completed' ? '#065f46' : '#92400e',
                          textTransform: 'capitalize'
                        }}
                      >
                        {transaction.status}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <>
            <View style={[styles.withdrawInfo, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <View style={styles.withdrawInfoContent}>
                <Ionicons name="wallet" size={20} color={primary} />
                <ThemedText type="sm" weight="medium" style={{ color: primary, flex: 1 }}>
                  Available to withdraw: NPR {formatAmount(stats.availableBalance)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.withdrawForm, { backgroundColor: background }]}>
              <ThemedText type="base" weight="semibold" style={{ color: gray900, marginBottom: 12 }}>
                Withdrawal Details
              </ThemedText>

              {/* Amount Field */}
              <View style={styles.formField}>
                <ThemedText type="sm" weight="medium" style={{ color: gray700, marginBottom: 6 }}>
                  Amount
                </ThemedText>
                <View style={styles.inputWrapper}>
                  <ThemedText type="base" weight="medium" style={{ position: 'absolute', left: 12, top: 12, color: gray500 }}>
                    NPR
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, { paddingLeft: 46, backgroundColor: background, color: gray900, borderColor: gray400 }]}
                    placeholder="Enter amount"
                    placeholderTextColor={gray400}
                    keyboardType="number-pad"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    maxLength={10}
                  />
                </View>
                <ThemedText type="xs" style={{ color: gray500, marginTop: 4 }}>
                  Minimum withdrawal: NPR 1,000
                </ThemedText>
              </View>

              {/* Withdrawal Method */}
              <View style={styles.formField}>
                <ThemedText type="sm" weight="medium" style={{ color: gray700, marginBottom: 6 }}>
                  Withdrawal Method
                </ThemedText>
                <View style={styles.methodSelector}>
                  {['bank', 'esewa', 'khalti'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodOption,
                        { borderColor: withdrawMethod === method ? primary : gray400 },
                        withdrawMethod === method && { backgroundColor: '#eff6ff' }
                      ]}
                      onPress={() => setWithdrawMethod(method)}
                    >
                      <ThemedText
                        type="xs"
                        weight={withdrawMethod === method ? 'semibold' : 'medium'}
                        style={{ color: withdrawMethod === method ? primary : gray500 }}
                      >
                        {method === 'bank'
                          ? 'Bank Transfer'
                          : method === 'esewa'
                            ? 'eSewa'
                            : 'Khalti'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Account Details */}
              <View style={styles.formField}>
                <ThemedText type="sm" weight="medium" style={{ color: gray700, marginBottom: 6 }}>
                  Bank Account / Wallet ID
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: background, color: gray900, borderColor: gray400 }]}
                  placeholder="Enter account details"
                  placeholderTextColor={gray400}
                  value={accountDetails}
                  onChangeText={setAccountDetails}
                />
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: primary }]}>
                <ThemedText type="sm" weight="semibold" style={{ color: 'white' }}>
                  Request Withdrawal
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: background }]}>
              <ThemedText type="sm" weight="semibold" style={{ color: gray900, marginBottom: 8 }}>
                Withdrawal Information
              </ThemedText>
              <View style={styles.infoList}>
                <ThemedText type="xs" style={{ color: gray600 }}>• Processing time: 1-3 business days</ThemedText>
                <ThemedText type="xs" style={{ color: gray600 }}>• Transaction fee: 2% (max NPR 100)</ThemedText>
                <ThemedText type="xs" style={{ color: gray600 }}>• Minimum withdrawal amount: NPR 1,000</ThemedText>
                <ThemedText type="xs" style={{ color: gray600 }}>• Funds are transferred during business hours</ThemedText>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  withdrawBtn: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 160,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  pendingCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionStatus: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  withdrawInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  withdrawInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  withdrawForm: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formField: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  methodOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  infoBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoList: {
    gap: 4,
  },
});
