/**
 * App Navigator - Điều hướng ứng dụng
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks';
import { Loading } from '../components';
import { Colors } from '../constants';

// Screens
import {
    LoginScreen,
    RegisterScreen,
    OTPScreen,
    HomeScreen,
    BorrowerDashboard,
    LenderDashboard,
    LoansListScreen,
    CreateLoanScreen,
    LoanPreviewScreen,
    LoanDetailScreen,
    DisbursementMethodScreen,
    InvestmentsScreen,
    WalletScreen,
    PaymentsScreen,
    ProfileScreen,
    EkycScreen,
    WaitingRoomScreen,
    ReminderScreen,
    NotificationsScreen,

    RepaymentScheduleScreen,
    AutoInvestScreen,
    CreateAutoInvestScreen
} from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
);

// Tab icon config
const getTabIcon = (routeName, focused) => {
    const icons = {
        Home: focused ? 'home' : 'home-outline',
        Loans: focused ? 'file-document' : 'file-document-outline',
        Investments: focused ? 'trending-up' : 'trending-up',
        Wallet: focused ? 'wallet' : 'wallet-outline',
        Profile: focused ? 'account' : 'account-outline',
        WaitingRooms: focused ? 'account-clock' : 'account-clock-outline',
        Reminders: focused ? 'bell' : 'bell-outline',
        PaymentsTab: focused ? 'history' : 'history',
    };
    return icons[routeName] || 'circle';
};

// Main Tabs - Dynamic based on user category
const MainTabs = () => {
    const { user } = useAuth();
    const isBorrower = user?.category === 'borrower';
    const isLender = user?.category === 'lender';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const iconName = getTabIcon(route.name, focused);
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: '#999',
            })}
        >
            {/* Borrower: Home = Dashboard */}
            {isBorrower && (
                <Tab.Screen name="Home" component={BorrowerDashboard} options={{ title: 'Trang chủ' }} />
            )}

            {/* Lender: Home = LenderDashboard */}
            {isLender && (
                <Tab.Screen name="Home" component={LenderDashboard} options={{ title: 'Tổng quan' }} />
            )}

            {/* Borrower: Khoản vay & Thông báo */}
            {isBorrower && (
                <>
                    <Tab.Screen name="Loans" component={LoansListScreen} options={{ title: 'Khoản vay' }} />
                    <Tab.Screen name="Reminders" component={ReminderScreen} options={{ title: 'Thông báo' }} />
                    {/* Move Payments to Stack only or keep as needed. User asked for Reminders to be a tab */}
                </>
            )}

            {/* Lender: Đầu tư (Marketplace) - Pass params mode='marketplace' */}
            {isLender && (
                <Tab.Screen
                    name="InvestLoans"
                    component={LoansListScreen}
                    options={{
                        title: 'Tìm khoản',
                        tabBarIcon: ({ focused, color, size }) => (
                            <MaterialCommunityIcons name="magnify" size={size} color={color} />
                        )
                    }}
                    initialParams={{ mode: 'marketplace' }}
                />
            )}

            {/* Lender: Quản lý đầu tư - Giữ lại nếu muốn xem list riêng */}
            {isLender && (
                <Tab.Screen name="Investments" component={InvestmentsScreen} options={{ title: 'Đầu tư của tôi' }} />
            )}

            {isLender && (
                <Tab.Screen name="WaitingRooms" component={WaitingRoomScreen} options={{ title: 'Phòng chờ' }} />
            )}

            <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Ví' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
        </Tab.Navigator>
    );
};

// Main Stack
const MainStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CreateLoan" component={CreateLoanScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoanPreview" component={LoanPreviewScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DisbursementMethod" component={DisbursementMethodScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Thanh toán' }} />
        {/* Fallback routes if navigated directly, though they are in tabs now */}
        <Stack.Screen name="WaitingRooms" component={WaitingRoomScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Reminders" component={ReminderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RepaymentSchedule" component={RepaymentScheduleScreen} options={{ headerShown: false }} />
        <Stack.Screen
            name="AutoInvest"
            component={AutoInvestScreen}
            options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom'
            }}
        />
        <Stack.Screen name="Ekyc" component={EkycScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

// Root Navigator
const AppNavigator = () => {
    const { isLoading, isLoggedIn } = useAuth();

    if (isLoading) {
        return <Loading fullScreen text="Đang khởi động..." />;
    }

    return (
        <NavigationContainer>
            {isLoggedIn ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;
