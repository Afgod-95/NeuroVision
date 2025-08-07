import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Image,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';

export type UploadedFile = {
    id: string;
    name: string;
    type: 'image' | 'document' | 'pdf' | 'video' | 'audio';
    uri?: string;
    size?: number;
    uploadProgress?: number; // 0 to 100
    isUploading?: boolean;
    thumbnail?: string;
};

type UploadedFilesProps = {
    files: UploadedFile[];
    onRemoveFile?: (fileId: string) => void;
};

const UploadedFiles: React.FC<UploadedFilesProps> = ({ files, onRemoveFile }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: files.length > 0 ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: files.length > 0 ? 0 : 10,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [files.length]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'document':
                return 'document-text-outline';
            case 'pdf':
                return 'document-outline';
            case 'video':
                return 'videocam-outline';
            case 'audio':
                return 'musical-notes-outline';
            default:
                return 'document-outline';
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const kb = bytes / 1024;
        return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
    };

    // Helper function to check if file is an image based on name extension
    const isImageFile = (fileName: string, fileType: string) => {
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
        const lowerFileName = fileName?.toLowerCase();
        return fileType === 'image' || imageExtensions.some(ext => lowerFileName?.endsWith(ext));
    };

    // Get image source - prioritize thumbnail, fallback to uri
    const getImageSource = (file: UploadedFile) => {
        return file.thumbnail || file.uri;
    };

    const renderFile = ({ item: file }: { item: UploadedFile }) => (
        <TouchableWithoutFeedback>
            <View style={styles.itemWrapper}>
                {isImageFile(file.name, file.type) && getImageSource(file) ? (
                    <View style={styles.imageCard} key={file.id}>
                        <Image
                            source={{ uri: getImageSource(file) }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => onRemoveFile?.(file.id)}
                        >
                            <Ionicons name="close" size={16} color="black" />
                        </TouchableOpacity>
                        <Text style={styles.imageName} numberOfLines={1}>
                            {file.name}
                        </Text>
                        <Text style={styles.imageSize}>{formatSize(file.size)}</Text>

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

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >

            <FlatList
                data={files}
                renderItem={renderFile}
                keyExtractor={(item) => item.id}
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
    },
    flatListContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemWrapper: {
        marginRight: 10,
    },
    filePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.bgSecondary,
        borderColor: Colors.dark.borderColor,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
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
    },
    removeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 2,
    },
    imageName: {
        fontSize: 11,
        color: Colors.dark.txtPrimary,
        marginTop: 4,
    },
    imageSize: {
        fontSize: 10,
        color: Colors.dark.txtSecondary,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: Colors.dark.borderColor,
        borderRadius: 2,
        marginTop: 4,
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
    },
    uploadingText: {
        fontSize: 11,
        color: '#FBBF24',
    },
    closeIcon: {
        marginLeft: 6,
    },
});

export default UploadedFiles;