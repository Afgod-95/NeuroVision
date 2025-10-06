import { StyleSheet } from "react-native";
import { Colors } from "@/src/constants/Colors";

const BASE_HEADER_HEIGHT = 30;

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.bgPrimary,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.dark.bgPrimary,
    },
    headerTitle: {
        color: Colors.dark.txtPrimary,
        fontWeight: '600',
        fontSize: 18,
    },
    backButton: {
        padding: 4,
        height: BASE_HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButton: {
        padding: 4,
        height: BASE_HEADER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.dark.txtPrimary,
        marginBottom: 16,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.dark.bgSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    changePhotoButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 20,
    },
    changePhotoText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.dark.txtPrimary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.dark.txtPrimary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputDisabled: {
        opacity: 0.6,
    },
    textArea: {
        minHeight: 120,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    securityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 12,
        padding: 16,
    },
    securityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    securityItemText: {
        color: Colors.dark.txtPrimary,
        fontSize: 16,
        marginLeft: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.bgSecondary,
    },
    statusLabel: {
        fontSize: 16,
        color: Colors.dark.txtSecondary,
    },
    statusValue: {
        fontSize: 16,
        color: Colors.dark.txtPrimary,
        fontWeight: '500',
    },
    privacyContent: {
        paddingBottom: 20,
    },
    privacyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.dark.txtPrimary,
        marginBottom: 8,
    },
    privacyDate: {
        fontSize: 14,
        color: Colors.dark.txtSecondary,
        marginBottom: 24,
    },
    privacySection: {
        fontSize: 15,
        lineHeight: 24,
        color: Colors.dark.txtPrimary,
        marginBottom: 20,
    },
    privacySectionTitle: {
        fontWeight: '600',
        fontSize: 16,
    },
    faqTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.dark.txtPrimary,
        marginBottom: 24,
    },
    faqItem: {
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    faqQuestionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.dark.txtPrimary,
        marginRight: 12,
    },
    faqAnswer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    faqAnswerText: {
        fontSize: 15,
        lineHeight: 22,
        color: Colors.dark.txtSecondary,
    },
    contactSection: {
        marginTop: 32,
        padding: 20,
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 12,
        alignItems: 'center',
    },
    contactTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.dark.txtPrimary,
        marginBottom: 8,
    },
    contactText: {
        fontSize: 15,
        color: Colors.dark.txtSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    contactButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    supportSection: {
        marginBottom: 32,
    },
    supportTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.dark.txtPrimary,
        marginBottom: 8,
    },
    supportDescription: {
        fontSize: 15,
        color: Colors.dark.txtSecondary,
        lineHeight: 22,
        marginBottom: 24,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    alternativeContact: {
        padding: 20,
        backgroundColor: Colors.dark.bgSecondary,
        borderRadius: 12,
    },
    alternativeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.dark.txtPrimary,
        marginBottom: 16,
    },
    contactMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    contactMethodText: {
        fontSize: 15,
        color: Colors.dark.txtPrimary,
        marginLeft: 12,
    },
});