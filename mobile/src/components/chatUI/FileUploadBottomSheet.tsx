import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { X, ImagePlus, Camera, FolderOpen, Sparkles } from 'lucide-react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../constants/Colors';
import { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

const { width } = Dimensions.get('window');

type BottomSheetModalProps = {
  bottomSheetRef: React.RefObject<BottomSheetMethods | null>;
  onFileSelected?: (file: any) => void;
  onFilesSelected?: (files: any[]) => void;
  onCreateImage?: () => void; // New prop for create image action
};

const BottomSheetModal = ({ 
  bottomSheetRef, 
  onFileSelected, 
  onFilesSelected,
  onCreateImage 
}: BottomSheetModalProps) => {
  
  // variables
  const snapPoints = useMemo(() => ["50%"], []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('Sheet index:', index);
  }, []);

  const handleClose = () => {
    bottomSheetRef.current?.close();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Camera function
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        console.log('Photo taken:', result.assets[0]);
        onFileSelected?.(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Upload multiple images from library
  const handleUploadMultipleImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [],
        allowsEditing: false, 
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3, 
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log('Multiple images selected:', result.assets);

        if (onFilesSelected) {
          onFilesSelected(result.assets);
        } else {
          result.assets.forEach((asset, index) => {
            setTimeout(() => {
              onFileSelected?.(asset);
            }, index * 100); 
          });
        }
      }
    } catch (error) {
      console.error('Error selecting multiple images:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  // Browse all files
  const handleBrowseFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        console.log('Files selected:', result.assets);

        if (onFilesSelected && result.assets.length > 1) {
          onFilesSelected(result.assets);
        } else if (result.assets.length === 1) {
          onFileSelected?.(result.assets[0]);
        } else {
          result.assets.forEach((asset, index) => {
            setTimeout(() => {
              onFileSelected?.(asset);
            }, index * 100);
          });
        }
      }
    } catch (error) {
      console.error('Error browsing files:', error);
      Alert.alert('Error', 'Failed to browse files');
    }
  };

  // Handle create image
  const handleCreateImage = () => {
    console.log('Create image action triggered');
    onCreateImage?.();
  };

  const actions = [
    {
      icon: Camera,
      label: 'Take Photo',
      subtitle: 'Capture with camera',
      color: '#007AFF',
      onPress: handleTakePhoto,
    },
    {
      icon: ImagePlus,
      label: 'Upload Images',
      subtitle: 'Select multiple from library',
      color: '#34C759',
      onPress: handleUploadMultipleImages,
    },
    {
      icon: FolderOpen,
      label: 'Add Files',
      subtitle: 'Select from device',
      color: '#FF9500',
      onPress: handleBrowseFiles,
    },
    {
      icon: Sparkles,
      label: 'Create Image',
      subtitle: 'Generate with AI',
      color: '#AF52DE',
      onPress: handleCreateImage,
    }
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Add Content</Text>
            <Text style={styles.subtitle}>Choose what you&apos;d like to add</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={20} color={Colors.dark.txtPrimary} />
          </Pressable>
        </View>

        {/* Action Grid */}
        <View style={styles.actionsGrid}>
          {actions.map((action, index) => (
            <ActionCard
              key={index}
              icon={action.icon}
              label={action.label}
              subtitle={action.subtitle}
              color={action.color}
              onPress={() => {
                action.onPress();
                handleClose();
              }}
            />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

// Action Card Component
const ActionCard = ({
  icon: Icon,
  label,
  subtitle,
  color,
  onPress,
}: {
  icon: React.ElementType;
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionCard,
      pressed && styles.actionCardPressed,
    ]}
    onPress={onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon size={22} color="white" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <Text style={styles.actionSubtitle}>{subtitle}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: Colors.dark.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  handleIndicator: {
    backgroundColor: Colors.dark.borderColor,
    width: 36,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.txtSecondary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: Colors.dark.borderColor,
    borderRadius: 20,
    marginLeft: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 24,
    gap: 16,
  },
  actionCard: {
    width: (width - 60) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  actionCardPressed: {
    backgroundColor: Colors.dark.borderColor,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.dark.txtSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default BottomSheetModal;