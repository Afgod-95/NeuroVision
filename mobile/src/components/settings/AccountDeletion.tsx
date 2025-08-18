import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Colors } from '../../constants/Colors';
import { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useCustomAlert } from '../alert/CustomAlert';
import Loading from '../Loaders/Loading';


type AccountDeletionSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheetMethods | null>;
  onDelete?: () => void;
  onCancel?: () => void;
  userName?: string;
  isLoading: boolean,
};

const AccountDeletionSheet = ({
  bottomSheetRef,
  onDelete,
  onCancel,
  isLoading,
  userName = "User"
}: AccountDeletionSheetProps) => {
  // Variables
  const snapPoints = useMemo(() => ["45%"], []);
  const { AlertComponent, showWarning } = useCustomAlert();

  const handleSheetChanges = useCallback((index: number) => {
    console.log('Sheet index:', index);
  }, []);

  const handleClose = () => {
    bottomSheetRef.current?.close();
    onCancel?.();
  };

  const handleDelete = () => {
    showWarning('Final Confirmation', 'Are you absolutely sure? This action cannot be undone.', {
      primaryButtonText: 'Delete',
      onPrimaryPress: () => {
         bottomSheetRef.current?.close();
         onDelete?.();
      },
      secondaryButtonText: 'Cancel',
      onSecondaryPress: () => {
        bottomSheetRef.current?.close();
      }
    })
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  return (
    <>
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
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <X size={20} color={Colors.dark.txtSecondary} />
            </Pressable>
          </View>

          {/* Warning Icon */}
          <View style={styles.warningContainer}>
            <View style={styles.warningIconContainer}>
              <AlertTriangle size={32} color="#FF3B30" />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.subtitle}>
              Hi <Text style={styles.userName}>{userName}</Text>, we&apos;re sorry to see you go
            </Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                This action is permanent and cannot be undone. Your account and all associated data will be permanently deleted.
              </Text>
            </View>

            <View style={styles.consequencesList}>
              <Text style={styles.consequencesTitle}>What will happen:</Text>
              <Text style={styles.consequenceItem}>• Your profile will be permanently removed</Text>
              <Text style={styles.consequenceItem}>• All your data will be deleted</Text>
              <Text style={styles.consequenceItem}>• You&apos;ll lose access to all services</Text>
              <Text style={styles.consequenceItem}>• This action cannot be reversed</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Keep Account</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
              onPress={handleDelete}
            >
              {isLoading ? <Loading /> : <Text style={styles.deleteButtonText}>Delete Forever</Text>}
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
      <AlertComponent />
    </>

  );
};

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
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  handleIndicator: {
    backgroundColor: Colors.dark.borderColor,
    width: 36,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.txtPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.txtSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  consequencesList: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  consequencesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
    marginBottom: 12,
  },
  consequenceItem: {
    fontSize: 14,
    color: Colors.dark.txtSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.borderColor,
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.txtPrimary,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: '#E8312A',
    transform: [{ scale: 0.98 }],
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AccountDeletionSheet;