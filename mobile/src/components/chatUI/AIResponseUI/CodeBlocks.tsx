import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { Colors } from '@/src/constants/Colors';
import { Feather } from '@expo/vector-icons';

import * as Clipboard from 'expo-clipboard';


export const useCodeBlock = () => {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [mainCopied, setMainCopied] = useState(false);

  // Enhanced content type detection
  const detectContentTypes = (text: string) => {
    return {
      hasCodeBlocks: /```[\s\S]*?```/.test(text),
      hasInlineCode: hasInlineCode(text),
      hasTables: /\|.*\|/.test(text),
      hasLists: /^[\s]*[-*+]\s|^[\s]*\d+\.\s/m.test(text),
      hasHeaders: /^#{1,6}\s/m.test(text),
      hasBlockquotes: /^>\s/m.test(text),
      hasLinks: /\[.*?\]\(.*?\)/.test(text),
      hasBold: /\*\*.*?\*\*|__.*?__/.test(text),
      hasItalic: /\*.*?\*|_.*?_/.test(text),
    };
  };

  // Enhanced code block extraction with better handling
  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
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

  // Enhanced inline code detection
  const hasInlineCode = (text: string) => {
    return /`[^`\n]+`/.test(text);
  };

  const CodeBlock = ({ code, language, blockId }: { code: string; language: string; blockId: string }) => {
    const isCopied = copiedStates[blockId];
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = code.split('\n').length > 15;

    const displayCode = shouldTruncate && !isExpanded
      ? code.split('\n').slice(0, 15).join('\n') + '\n...'
      : code;


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
      } catch (error) {
        Alert.alert('Error', 'Failed to copy content');
      }
    };

    return (
      <View style={styles.codeBlockContainer}>
        <View style={styles.codeHeader}>
          <Text style={styles.codeLanguage}>{language}</Text>
          <View style={styles.codeHeaderActions}>
            {shouldTruncate && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setIsExpanded(!isExpanded)}
              >
                <Text style={styles.expandButtonText}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopy(code, blockId)}
            >
              <Feather
                name={isCopied ? "check" : "copy"}
                size={16}
                color={isCopied ? "#10b981" : "#8e8ea0"}
              />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.codeScrollView}
          nestedScrollEnabled={true}
        >
          <Text style={styles.codeText}>{displayCode}</Text>
        </ScrollView>
      </View>
    );
  };


  const renderCustomMarkdown = (text: string) => {
    const codeBlocks = extractCodeBlocks(text);
    const contentTypes = detectContentTypes(text);

    if (codeBlocks.length === 0) {
      return (
        <View style={styles.markdownContainer}>
          <Markdown style={markdownStyles}>{text}</Markdown>
        </View>
      );
    }

    let processedText = text;

    codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      processedText = processedText.replace(block.fullMatch, placeholder);
    });

    const parts = processedText.split(/(__CODE_BLOCK_\d+__)/);

    return (
      <View style={styles.markdownContainer}>
        {parts.map((part, index) => {
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

          return part ? (
            <Markdown key={index} style={markdownStyles}>
              {part}
            </Markdown>
          ) : null;
        })}
      </View>
    );
  };
  return {
    //states
    copiedStates,
    mainCopied,

    //component
    CodeBlock,
    renderCustomMarkdown,

    //actions
    setCopiedStates,
    setMainCopied,

  }
}



const styles = StyleSheet.create({
  // Enhanced Code Block Styles
  codeBlockContainer: {
    marginVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  markdownContainer: {
    backgroundColor: 'transparent',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
  },
  codeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLanguage: {
    color: '#f0f6fc',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  expandButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#58a6ff',
  },
  expandButtonText: {
    color: '#58a6ff',
    fontSize: 11,
    fontWeight: '500',
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  codeScrollView: {
    maxHeight: 400,
  },
  codeText: {
    color: '#e6edf3',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
    padding: 16,
    minWidth: '100%',
  },
});


const markdownStyles = StyleSheet.create({
  // Root container - ensures no white background leaks
  body: {
    backgroundColor: 'transparent',
    color: '#f0f6fc',
  },
  // Text elements
  text: {
    color: '#f0f6fc',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System',
    backgroundColor: 'transparent',
  },
  paragraph: {
    marginBottom: 16,
    color: '#f0f6fc',
    backgroundColor: 'transparent',
  },
  // Headings
  heading1: {
    color: '#f0f6fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 24,
    lineHeight: 36,
    backgroundColor: 'transparent',
  },
  heading2: {
    color: '#f0f6fc',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
    lineHeight: 32,
    backgroundColor: 'transparent',
  },
  heading3: {
    color: '#f0f6fc',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 16,
    lineHeight: 28,
    backgroundColor: 'transparent',
  },
  heading4: {
    color: '#f0f6fc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
    lineHeight: 26,
    backgroundColor: 'transparent',
  },
  heading5: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    lineHeight: 24,
    backgroundColor: 'transparent',
  },
  heading6: {
    color: '#f0f6fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
    lineHeight: 22,
    backgroundColor: 'transparent',
  },
  // Inline code
  code_inline: {
    backgroundColor: '#21262d',
    color: '#79c0ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  // Blockquotes
  blockquote: {
    backgroundColor: 'rgba(33, 38, 45, 0.6)',
    borderLeftWidth: 4,
    borderLeftColor: '#f78166',
    paddingLeft: 16,
    paddingVertical: 12,
    paddingRight: 16,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  // Lists - Fixed to ensure proper visibility
  bullet_list: {
    marginBottom: 16,
    paddingLeft: 0,
    backgroundColor: 'transparent',
  },
  ordered_list: {
    marginBottom: 16,
    paddingLeft: 0,
    backgroundColor: 'transparent',
  },
  list_item: {
    marginBottom: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet_list_icon: {
    color: '#8e8ea0',
    fontSize: 16,
    marginRight: 8,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  ordered_list_icon: {
    color: '#8e8ea0',
    fontSize: 16,
    marginRight: 8,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  bullet_list_content: {
    color: '#f0f6fc',
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    backgroundColor: 'transparent',
  },
  ordered_list_content: {
    color: '#f0f6fc',
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Text formatting
  strong: {
    fontWeight: '600',
    color: '#f0f6fc',
    backgroundColor: 'transparent',
  },
  em: {
    fontStyle: 'italic',
    color: '#f0f6fc',
    backgroundColor: 'transparent',
  },
  s: {
    textDecorationLine: 'line-through',
    color: '#8e8ea0',
    backgroundColor: 'transparent',
  },
  // Links
  link: {
    color: '#58a6ff',
    textDecorationLine: 'underline',
    backgroundColor: 'transparent',
  },
  // Horizontal rule
  hr: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 24,
    borderWidth: 0,
  },
  // Tables
  table: {
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    marginVertical: 16,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: '#161b22',
  },
  tbody: {
    backgroundColor: 'transparent',
  },
  th: {
    borderBottomWidth: 1,
    borderBottomColor: '#30363d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '600',
    color: '#f0f6fc',
    backgroundColor: '#161b22',
  },
  td: {
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#e6edf3',
    backgroundColor: 'transparent',
  },
});