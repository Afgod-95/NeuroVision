import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Clipboard,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import Octicons from '@expo/vector-icons/Octicons';
import { Colors } from '@/src/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { FadeInDown, FadeOutUp } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AIResponseProps = {
  message: string;
  loading?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (type: 'like' | 'dislike', messageId?: string) => void;
  messageId?: string;
  timestamp?: Date;
  model?: string;
  tokensUsed?: number;
  responseTime?: number;
};

const AdvancedAIResponse = ({
  message,
  loading = false,
  onRegenerate,
  onFeedback,
  messageId,
  timestamp = new Date(),
  model = "Claude Sonnet 4",
  tokensUsed,
  responseTime,
}: AIResponseProps) => {
  const [isLiked, setIsLiked] = useState<'like' | 'dislike' | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const [expandedBlocks, setExpandedBlocks] = useState<{[key: string]: boolean}>({});
  const [showMetadata, setShowMetadata] = useState(false);
  const [mainCopied, setMainCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLike = (type: 'like' | 'dislike') => {
    const newState = isLiked === type ? null : type;
    setIsLiked(newState);
    onFeedback?.(type, messageId);
  };

  const handleCopy = async (text: string, blockId?: string) => {
    try {
      await Clipboard.setString(text);
      
      if (blockId) {
        setCopiedStates(prev => ({ ...prev, [blockId]: true }));
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [blockId]: false }));
        }, 2000);
      } else {
        setMainCopied(true);
        setTimeout(() => {
          setMainCopied(false);
        }, 2000);
      }
      
      // No alert needed - visual feedback is sufficient
    } catch (error) {
      Alert.alert('Error', 'Failed to copy content');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: message,
        title: 'AI Response from Claude',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        id: `code-${blocks.length}`,
        language: match[1] || 'text',
        code: match[2].trim(),
        fullMatch: match[0],
      });
    }
    
    return blocks;
  };

  const CodeBlock = ({ code, language, blockId }: { code: string; language: string; blockId: string }) => {
    const isCopied = copiedStates[blockId];
    const isExpanded = expandedBlocks[blockId];
    const shouldTruncate = code.split('\n').length > 10;
    const displayCode = shouldTruncate && !isExpanded 
      ? code.split('\n').slice(0, 10).join('\n') + '\n...'
      : code;

    return (
      <View style={styles.codeBlockContainer}>
        <View style={styles.codeHeader}>
          <View style={styles.codeLanguage}>
            <Text style={styles.codeLanguageText}>{language}</Text>
          </View>
          <View style={styles.codeActions}>
            {shouldTruncate && (
              <TouchableOpacity
                style={styles.codeActionButton}
                onPress={() => setExpandedBlocks(prev => ({ ...prev, [blockId]: !isExpanded }))}
              >
                <Feather 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#888" 
                />
                <Text style={styles.codeActionText}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.codeActionButton, isCopied && styles.copiedButton]}
              onPress={() => handleCopy(code, blockId)}
            >
              <Feather 
                name={isCopied ? "check" : "copy"} 
                size={14} 
                color={isCopied ? "#22c55e" : "#888"} 
              />
              <Text style={[styles.codeActionText, isCopied && styles.copiedText]}>
                {isCopied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView 
          horizontal 
          style={styles.codeScrollView}
          showsHorizontalScrollIndicator={false}
        >
          <Text style={styles.codeText}>{displayCode}</Text>
        </ScrollView>
      </View>
    );
  };

  const renderCustomMarkdown = (text: string) => {
    const codeBlocks = extractCodeBlocks(text);
    
    if (codeBlocks.length === 0) {
      return <Markdown style={markdownStyles}>{text}</Markdown>;
    }

    let processedText = text;
    const components = [];
    
    codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedText = processedText.replace(block.fullMatch, placeholder);
    });

    const parts = processedText.split(/(__CODE_BLOCK_\d+__)/);
    
    return parts.map((part, index) => {
      const codeBlockMatch = part.match(/__CODE_BLOCK_(\d+)__/);
      
      if (codeBlockMatch) {
        const blockIndex = parseInt(codeBlockMatch[1]);
        const block = codeBlocks[blockIndex];
        return (
          <CodeBlock
            key={`code-${blockIndex}`}
            code={block.code}
            language={block.language}
            blockId={block.id}
          />
        );
      }
      
      return part ? <Markdown key={index} style={markdownStyles}>{part}</Markdown> : null;
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          {/*
            <View style={styles.header}>
              <View style={styles.aiAvatar}>
                <Feather name="cpu" size={20} color="#fff" />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.aiName}>Claude</Text>
                <Text style={styles.modelName}>{model}</Text>
              </View>
            </View>
          */}
          
          <View style={styles.loadingContainer}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
              <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
              <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
            </View>
            <Text style={styles.loadingText}>Claude is thinking...</Text>
          </View>
        </View>
      </View>
    );
  }

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
      <View style={styles.messageContainer}>
        {/* Header 
        <View style={styles.header}>
          <View style={styles.aiAvatar}>
            <MaterialIcons name="smart-toy" size={20} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.aiName}>Claude</Text>
            <Text style={styles.modelName}>{model}</Text>
          </View>
          <TouchableOpacity
            style={styles.metadataToggle}
            onPress={() => setShowMetadata(!showMetadata)}
          >
            <Feather name="info" size={16} color={Colors.dark.txtSecondary} />
          </TouchableOpacity>
        </View>
        */}

        {/* Metadata */}
        {showMetadata && (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {timestamp.toLocaleString()} • {tokensUsed} tokens
              {responseTime && ` • ${responseTime}ms`}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderCustomMarkdown(message)}
          </ScrollView>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={[styles.actionButton, isLiked === 'like' && styles.likedButton]}
              onPress={() => handleLike('like')}
            >
              <Octicons 
                name="thumbsup" 
                size={16} 
                color={isLiked === 'like' ? '#22c55e' : Colors.dark.txtSecondary} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isLiked === 'dislike' && styles.dislikedButton]}
              onPress={() => handleLike('dislike')}
            >
              <Octicons 
                name="thumbsdown" 
                size={16} 
                color={isLiked === 'dislike' ? '#ef4444' : Colors.dark.txtSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, mainCopied && styles.copiedButton]}
              onPress={() => handleCopy(message)}
            >
              <Feather 
                name={mainCopied ? "check" : "copy"} 
                size={16} 
                color={mainCopied ? "#22c55e" : Colors.dark.txtSecondary} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Feather name="share-2" size={16} color={Colors.dark.txtSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowActions(!showActions)}
            >
              <Feather name="more-horizontal" size={16} color={Colors.dark.txtSecondary} />
            </TouchableOpacity>
          </View>

          {onRegenerate && (
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={onRegenerate}
            >
              <MaterialIcons name="refresh" size={14} color="#fff" />
              <Text style={styles.regenerateText}>Regenerate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Extended Actions */}
        {showActions && (
          <Animated.View style={styles.extendedActions}
          >
            <TouchableOpacity style={styles.extendedAction}>
              <Ionicons name="bookmark-outline" size={16} color={Colors.dark.txtSecondary} />
              <Text style={styles.extendedActionText}>Save Response</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extendedAction}>
              <Ionicons name="flag-outline" size={16} color={Colors.dark.txtSecondary} />
              <Text style={styles.extendedActionText}>Report Issue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extendedAction}>
              <Feather name="edit-3" size={16} color={Colors.dark.txtSecondary} />
              <Text style={styles.extendedActionText}>Edit & Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  messageContainer: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  aiName: {
    color: Colors.dark.txtPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modelName: {
    color: Colors.dark.txtSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  metadataToggle: {
    padding: 8,
  },
  metadataToggleText: {
    color: Colors.dark.txtSecondary,
    fontSize: 16,
  },
  metadata: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  metadataText: {
    color: Colors.dark.txtSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  contentContainer: {
    padding: 16,
    minHeight: 60,
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 20,
 
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.txtSecondary,
    marginHorizontal: 2,
  },
  loadingText: {
    color: Colors.dark.txtSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  codeBlockContainer: {
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  codeLanguage: {
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  codeLanguageText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  codeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
    gap: 4,
  },
  copiedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  codeActionText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  copiedText: {
    color: '#22c55e',
  },
  codeScrollView: {
    maxHeight: 300,
  },
  codeText: {
    color: '#d4d4d4',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
    padding: 12,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  likedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  dislikedButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionIcon: {
    fontSize: 16,
  },
  likedIcon: {
    // Additional styling for liked state
  },
  dislikedIcon: {
    // Additional styling for disliked state
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    gap: 6,
  },
  regenerateIcon: {
    fontSize: 14,
  },
  regenerateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  extendedActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
  },
  extendedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  extendedActionText: {
    color: Colors.dark.txtSecondary,
    fontSize: 14,
  },
});

const markdownStyles = StyleSheet.create({
  text: {
    color: Colors.dark.txtPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginBottom: 12,
  },
  heading1: {
    color: Colors.dark.txtPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    color: Colors.dark.txtPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  heading3: {
    color: Colors.dark.txtPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
  },
  code_inline: {
    backgroundColor: '#2d2d2d',
    color: '#f8f8f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 13,
  },
  blockquote: {
    backgroundColor:'#2a2a2a',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    paddingLeft: 16,
    paddingVertical: 12,
    marginVertical: 12,
    borderRadius: 4,
  },
  list_item: {
    marginBottom: 6,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  strong: {
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
  },
  em: {
    fontStyle: "italic",
    color: Colors.dark.txtPrimary,
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
}) 

export default AdvancedAIResponse;