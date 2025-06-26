import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Dimensions } from 'react-native'
import React, { useState, } from 'react'
import { GeneratedImage, } from '@/src/utils/types/Types';
import { ScrollView } from 'react-native-gesture-handler';
import Loading from '../../Loaders/Loading';
import Animated, { useSharedValue, useAnimatedStyle} from 'react-native-reanimated';



const { width: SCREEN_WIDTH } = Dimensions.get('window');


const useImageGallery = () => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});

  const ImageGallery = ({ images }: { images: GeneratedImage[] }) => {
    if (images.length === 0) return null;
    const handleImagePress = (image: GeneratedImage) => {
      setSelectedImage(image);
    };
    return (
      <>
        <View style={styles.imageGalleryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScrollContainer}
            nestedScrollEnabled={true}
          >
            {images.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={styles.imageContainer}
                onPress={() => handleImagePress(image)}
                activeOpacity={0.8}
              >
                <View style={styles.imageWrapper}>
                  {imageLoadingStates[image.id] && (
                    <View style={styles.imageLoadingOverlay}>
                      <Loading />
                    </View>
                  )}
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.generatedImage}
                    onLoadStart={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: true }))}
                    onLoadEnd={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: false }))}
                    onError={() => setImageLoadingStates(prev => ({ ...prev, [image.id]: false }))}
                  />
                </View>
                {image.prompt && (
                  <Text style={styles.imagePrompt} numberOfLines={2}>
                    {image.prompt}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </>

    );
  }

  return {
    selectedImage,
    setSelectedImage,
    ImageGallery
  }
};

const styles = StyleSheet.create({
  // Image Gallery Styles
  imageGalleryContainer: {
    marginBottom: 16,
  },
  imageScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  imageContainer: {
    width: 200,
    marginRight: 12,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#21262d',
  },
  generatedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imagePrompt: {
    color: '#8e8ea0',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },

   // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 40,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 38, 45, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  modalActionText: {
    color: '#f0f6fc',
    fontSize: 14,
    fontWeight: '500',
  },
  modalPrompt: {
    marginTop: 16,
    backgroundColor: 'rgba(33, 38, 45, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  modalPromptText: {
    color: '#f0f6fc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default useImageGallery