import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    Pressable,
    TouchableOpacity,
    PanResponder,
    FlatList
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Colors } from '@/src/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import SearchBar from './SearchBar';
import RecentMessages from '../chatUI/RecentMessages';
import dummyMessages from '@/src/utils/dummyMessage';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/redux/store';
import { getUsernameInitials } from '@/src/constants/getUsernameInitials';
import { router } from 'expo-router';


const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;
const SWIPE_THRESHOLD = SIDEBAR_WIDTH / 3;

type CustomSideBarProps = {
    isVisible: boolean;
    onClose: () => void;
    onOpen: () => void;
};

const CustomSideBar: React.FC<CustomSideBarProps> = ({ isVisible, onClose, onOpen }) => {
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const sidebarWidth = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isDragging, setIsDragging] = useState(false);
    const [searchbarVisible, setSearchbarVisible] = useState(false);
    const { user: userCredentials } = useSelector((state: RootState) => state.user )
    //search function
    const [searchQuery, setSearchQuery] = useState('');
    

    //getting username from redux state
    const username = userCredentials?.username
    const userInitials = getUsernameInitials({ fullname: userCredentials?.username ?? '' });
    //onChange tfunction for searchbar
    const onSearch = (query: string) => {
        setSearchQuery(query)
    }

    //clear search function
    const clearSearch = () => {
        setSearchQuery('')
    }

    //open seetings screen
    const openSettings = () => {
        router.push('/(home)/settings');
    }


    useEffect(() => {
        Animated.timing(sidebarWidth, {
            toValue: searchbarVisible ? width : SIDEBAR_WIDTH,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [searchbarVisible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !searchbarVisible,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (searchbarVisible) return false;
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 3);
            },
            onPanResponderGrant: () => {
                setIsDragging(true);
            },
            onPanResponderMove: (_, gestureState) => {
                if (isVisible && !searchbarVisible) {
                    if (gestureState.dx < 0) {
                        translateX.setValue(gestureState.dx);
                    }
                } else if (!isVisible && !searchbarVisible) {
                    translateX.setValue(-SIDEBAR_WIDTH + gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false);
                if (searchbarVisible) return;

                if (isVisible) {
                    if (gestureState.dx < -SWIPE_THRESHOLD) {
                        onClose();
                    } else {
                        Animated.spring(translateX, {
                            toValue: 0,
                            useNativeDriver: false, 
                        }).start();
                    }
                } else {
                    if (gestureState.dx > SWIPE_THRESHOLD) {
                        onOpen();
                    } else {
                        Animated.spring(translateX, {
                            toValue: -SIDEBAR_WIDTH,
                            useNativeDriver: false,
                        }).start();
                    }
                }
            },
        })
    ).current;

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            Animated.timing(translateX, {
                toValue: 0,
                duration: isDragging ? 0 : 300,
                useNativeDriver: false, 
            }).start();
        } else {
            Animated.timing(translateX, {
                toValue: -SIDEBAR_WIDTH,
                duration: isDragging ? 0 : 300,
                useNativeDriver: false, 
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [isVisible, translateX, isDragging]);

    const backdropOpacity = translateX.interpolate({
        inputRange: [-SIDEBAR_WIDTH, 0],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const searchbarOpen = () => {
        setSearchbarVisible(true);
    };

    return shouldRender ? (
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.sidebar,
                    { 
                        transform: [{ translateX }],
                        width: sidebarWidth 
                    }
                ]}
                {...panResponder.panHandlers}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        {/* Hide tittle if search bar is open */}
                        {!searchbarVisible && <Text style={styles.title}>NeuraVision</Text>}
                        
                        {/* Hide search icon if search bar is open */}
                        {!searchbarVisible && (
                            <TouchableOpacity onPress={searchbarOpen}>
                                <Feather name="search" size={24} color={Colors.dark.txtSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <SearchBar
                        isVisible={searchbarVisible}
                        value={searchQuery}
                        onChangeText={onSearch}
                        onSearch={() => { /* implement search logic here if needed */ }}
                        onClear={clearSearch}
                        onCancel={() => setSearchbarVisible(false)}
                    />
                </View>

                {/* recent messages */}
                <RecentMessages 
                    messages={dummyMessages} 
                    search = {searchQuery}
                />
               
                <View style={styles.bottom}>
                    <TouchableOpacity style={styles.bottomContent} onPress={openSettings}>
                        <TouchableOpacity style={styles.userCont} onPress={openSettings}>
                            <View
                              
                                style={styles.userAccountButton}
                            >
                                <Text style={styles.userText}>{userInitials}</Text>
                            </View>
                            <Text style={styles.userText}>{username}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style = {{opacity: 0.5 }} onPress={openSettings}>
                            <Feather name="more-horizontal" size={24} color={Colors.dark.txtSecondary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    ) : null;
};

const styles = StyleSheet.create({
    overlay: {
        zIndex: 1000,
        elevation: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#000000',
        justifyContent: 'space-between',
    },
    contentContainer: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    item: {
        paddingVertical: 12,
    },
    itemText: {
        color: '#d1d5db',
        fontSize: 16,
    },
    bottom: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#1f2937',
        marginBottom: 20,
    },
    bottomContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    userAccountButton: {
        width: 40,
        height: 40,
        backgroundColor: Colors.dark.button,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCont: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    userText: {
        color: Colors.dark.txtPrimary,
        fontSize: 14,
        fontFamily: 'Manrope-ExtraBold',
    },
});

export default CustomSideBar;