import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking } from 'react-native';
import { Colors } from '@/src/constants/Colors';
const TermsAndConditions = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Terms and Conditions</Text>
      <Text style={styles.p}>Last updated: June 24, 2025</Text>
      <Text style={styles.p}>Please read these terms and conditions carefully before using Our Service.</Text>

      <Text style={styles.h2}>Interpretation and Definitions</Text>
      <Text style={styles.h3}>Interpretation</Text>
      <Text style={styles.p}>
        The words of which the initial letter is capitalized have meanings defined under the following conditions. 
        The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
      </Text>

      <Text style={styles.h3}>Definitions</Text>
      <Text style={styles.p}>For the purposes of these Terms and Conditions:</Text>
      
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Application</Text> means the software program provided by the Company downloaded by You on any electronic device, named NeuroVision
        </Text>
      </View>
      
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Application Store</Text> means the digital distribution service operated and developed by Apple Inc. (Apple App Store) or Google Inc. (Google Play Store) in which the Application has been downloaded.
        </Text>
      </View>

      {/* Continue with other definitions in the same format... */}

      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Terms and Conditions</Text> (also referred as &quot;Terms&quot;) mean these Terms and Conditions that form the entire agreement between You and the Company regarding the use of the Service. This Terms and Conditions agreement has been created with the help of the{' '}
          <Text 
            style={styles.link} 
            onPress={() => Linking.openURL('https://www.termsfeed.com/terms-conditions-generator/')}
          >
            Terms and Conditions Generator
          </Text>.
        </Text>
      </View>

      <Text style={styles.h2}>Acknowledgment</Text>
      <Text style={styles.p}>
        These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. 
        These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.
      </Text>
      <Text style={styles.p}>
        Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. 
        These Terms and Conditions apply to all visitors, users and others who access or use the Service.
      </Text>
      <Text style={styles.p}>
        By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.
      </Text>
      <Text style={styles.p}>
        You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.
      </Text>
      <Text style={styles.p}>
        Your access to and use of the Service is also conditioned on Your acceptance of and compliance with the Privacy Policy of the Company. 
        Our Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your personal information when You use the Application or the Website and tells You about Your privacy rights and how the law protects You. 
        Please read Our Privacy Policy carefully before using Our Service.
      </Text>

      {/* Continue with other sections in the same format... */}

      <Text style={styles.h2}>Contact Us</Text>
      <Text style={styles.p}>If you have any questions about these Terms and Conditions, You can contact us:</Text>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>By email: afgod98@gmail.com</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.dark.bgSecondary,
  },
  content: {
   paddingBottom: 100,
  },
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
   color: Colors.dark.txtPrimary,
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    color: Colors.dark.txtPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: Colors.dark.txtPrimary,
  },
  p: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    color: Colors.dark.txtSecondary,
  },
  strong: {
    fontWeight: 'bold',
  },
  link: {
    color: Colors.dark.link,
    textDecorationLine: 'underline',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    marginRight: 8,
    color: Colors.dark.txtPrimary
  },
});

export default TermsAndConditions;