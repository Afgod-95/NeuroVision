import { View, Text, ScrollView, Dimensions, StyleSheet, Image } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors } from '@/src/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingSlide = {
  id: number;
  image: any;
  title: string;
  description: string;
};

const onboardingData: OnboardingSlide[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1746655421130-9fba824e19f5?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: 'Welcome to the Future',
    description: 'Experience seamless interactions and discover amazing features that will transform your daily workflow.',
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1746655421130-9fba824e19f5?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: 'Smart & Intuitive',
    description: 'Our intelligent system learns from your preferences to provide personalized recommendations just for you.',
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1746655421130-9fba824e19f5?q=80&w=1976&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: 'Get Started Today',
    description: 'Join millions of users who have already discovered the power of our platform. Your journey begins now.',
  },
];

const Onboarding = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const autoScrollInterval = useRef<NodeJS.Timeout | number | null>(null);

  // Auto scroll functionality
  useEffect(() => {
    startAutoScroll();
    
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    autoScrollInterval.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % onboardingData.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * SCREEN_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000); // Auto scroll every 5 seconds
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = contentOffsetX;
    
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleScrollBeginDrag = () => {
    stopAutoScroll();
  };

  const handleScrollEndDrag = () => {
    // Restart auto scroll after 2 seconds of inactivity
    setTimeout(() => {
      startAutoScroll();
    }, 2000);
  };

  const renderSlide = (item: OnboardingSlide, index: number) => {
    return (
      <View key={item.id} style={styles.slide}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image}} 
            style={styles.image} 
            resizeMode="cover" 
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const RenderIndicator = (index: number) => {
    const animatedStyle = useAnimatedStyle(() => {
      const isActive = Math.round(scrollX.value / SCREEN_WIDTH) === index;
      
      const scale = withSpring(isActive ? 1.2 : 1, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      
      const width = withSpring(isActive ? 40 : 20, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      
      const opacity = withSpring(isActive ? 1 : 0.4, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });

      return {
        transform: [{ scale }],
        width,
        opacity,
        backgroundColor: isActive ? Colors.dark.button : '#6b7280',
      };
    });

    return (
      <Animated.View
        key={index}
        style={[styles.indicator, animatedStyle]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Indicators */}
      <View style={styles.indicatorContainer}>
        {onboardingData.map((_, index) => RenderIndicator(index))}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderSlide(item, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT * 0.4,
  },
  contentContainer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Manrope-Bold',
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontFamily: 'Manrope-Regular',
  },
});

export default Onboarding;