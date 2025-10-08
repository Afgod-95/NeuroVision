import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';

export type UploadedFile = {
  id: string; // must be UNIQUE
  name: string;
  type: string; // MIME type or file extension
  uri?: string;
  base64?: string;
  size?: number;
  uploadProgress?: number;
  isUploading?: boolean;
  thumbnail?: string;
};

type UploadedFilesProps = {
  files: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
};

const UploadedFiles: React.FC<UploadedFilesProps> = ({ files, onRemoveFile }) => {
  // Filter out invalid entries
  const validFiles = files.filter(file => file?.id && file?.name);

  // Animated values
  const fade = useSharedValue(0);
  const slide = useSharedValue(10);

  // Run animation when validFiles change
  useEffect(() => {
    const visible = validFiles.length > 0;
    fade.value = withTiming(visible ? 1 : 0, { duration: 200 });
    slide.value = withTiming(visible ? 0 : 10, { duration: 200 });
  }, [validFiles.length]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  // Utils
  const getIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('image')) return 'image-outline';
    if (lowerType.includes('pdf')) return 'document-outline';
    if (lowerType.includes('video')) return 'videocam-outline';
    if (lowerType.includes('audio')) return 'musical-notes-outline';
    if (lowerType.includes('word')) return 'document-text-outline';
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet')) return 'grid-outline';
    return 'document-outline';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  };

  const isImageFile = (fileName: string, fileType: string) => {
    const imageExt = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
    const lowerFileName = fileName?.toLowerCase() || '';
    const lowerFileType = fileType?.toLowerCase() || '';
    return lowerFileType.includes('image') || imageExt.some(ext => lowerFileName.endsWith(ext));
  };

  const getImageSource = (file: UploadedFile) => {
    if (file.thumbnail) return file.thumbnail;
    if (file.uri) return file.uri;
    if (file.base64)
      return file.base64.startsWith('data:')
        ? file.base64
        : `data:${file.type};base64,${file.base64}`;
    return undefined;
  };

  const renderFile = ({ item: file }: { item: UploadedFile }) => {
    if (!file?.id) return null;
    const imageSource = getImageSource(file);
    const isImage = isImageFile(file.name, file.type);

    return (
      <TouchableWithoutFeedback>
        <View style={styles.itemWrapper}>
          {isImage && imageSource ? (
            <View style={styles.imageCard}>
              <Image
                source={{ uri: imageSource }}
                style={styles.image}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveFile?.(file.id)}
                hitSlop={10}
              >
                <Ionicons name="close" size={16} color="black" />
              </TouchableOpacity>

              <Text style={styles.imageName} numberOfLines={1}>
                {file.name}
              </Text>
              {file.size && (
                <Text style={styles.imageSize}>{formatSize(file.size)}</Text>
              )}
              {file.isUploading && (
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${file.uploadProgress ?? 0}%` },
                    ]}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.filePill}>
              <Ionicons
                name={getIcon(file.type) as any}
                size={16}
                color={Colors.dark.txtSecondary}
                style={{ marginRight: 4 }}
              />
              <Text numberOfLines={1} style={styles.fileName}>
                {file.name}
              </Text>
              {file.size && (
                <Text style={styles.fileSize}> • {formatSize(file.size)}</Text>
              )}
              {file.isUploading && (
                <Text style={styles.uploadingText}> • Uploading</Text>
              )}
              {onRemoveFile && (
                <TouchableOpacity onPress={() => onRemoveFile(file.id)} hitSlop={10}>
                  <Ionicons
                    name="close"
                    size={14}
                    color={Colors.dark.txtSecondary}
                    style={styles.closeIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  if (validFiles.length === 0) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <FlatList
        data={validFiles}
        renderItem={renderFile}
        keyExtractor={(item, index) => item?.id?.toString() || `file-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  flatListContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemWrapper: { marginRight: 10 },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgSecondary,
    borderColor: Colors.dark.borderColor,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 250,
  },
  imageCard: {
    width: 100,
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 8,
    padding: 6,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.dark.borderColor,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    elevation: 2,
  },
  imageName: {
    fontSize: 11,
    color: Colors.dark.txtPrimary,
    marginTop: 4,
    fontFamily: 'Manrope-Medium',
  },
  imageSize: {
    fontSize: 10,
    color: Colors.dark.txtSecondary,
    fontFamily: 'Manrope-Regular',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: Colors.dark.borderColor,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#4ade80',
    borderRadius: 2,
  },
  fileName: {
    fontSize: 13,
    color: Colors.dark.txtPrimary,
    maxWidth: 150,
    fontFamily: 'Manrope-Medium',
  },
  fileSize: {
    fontSize: 11,
    color: Colors.dark.txtSecondary,
    fontFamily: 'Manrope-Regular',
  },
  uploadingText: {
    fontSize: 11,
    color: '#FBBF24',
    fontFamily: 'Manrope-Medium',
  },
  closeIcon: {
    marginLeft: 6,
  },
});

export default UploadedFiles;
