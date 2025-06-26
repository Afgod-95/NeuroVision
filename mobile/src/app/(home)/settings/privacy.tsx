import { Colors } from '@/src/constants/Colors';
import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking } from 'react-native';

const PrivacyPolicy = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Privacy Policy</Text>
      <Text style={styles.p}>Last updated: June 24, 2025</Text>
      <Text style={styles.p}>
        This Privacy Policy describes Our policies and procedures on the collection, 
        use and disclosure of Your information when You use the Service and tells You 
        about Your privacy rights and how the law protects You.
      </Text>
      <Text style={styles.p}>
        We use Your Personal data to provide and improve the Service. By using the Service, 
        You agree to the collection and use of information in accordance with this Privacy Policy. 
        This Privacy Policy has been created with the help of the{' '}
        <Text 
          style={styles.link} 
          onPress={() => Linking.openURL('https://www.termsfeed.com/privacy-policy-generator/')}
        >
          Privacy Policy Generator
        </Text>.
      </Text>

      <Text style={styles.h2}>Interpretation and Definitions</Text>
      <Text style={styles.h3}>Interpretation</Text>
      <Text style={styles.p}>
        The words of which the initial letter is capitalized have meanings defined under the following conditions. 
        The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
      </Text>

      <Text style={styles.h3}>Definitions</Text>
      <Text style={styles.p}>For the purposes of this Privacy Policy:</Text>
      
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Account</Text> means a unique account created for You to access our Service or parts of our Service.
        </Text>
      </View>
      
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.p}>
          <Text style={styles.strong}>Affiliate</Text> means an entity that controls, is controlled by or is under common control with a party, 
          where &quot;control&quot; means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.
        </Text>
      </View>

      {/* Continue with other list items similarly... */}

      <Text style={styles.h2}>Contact Us</Text>
      <Text style={styles.p}>If you have any questions about this Privacy Policy, You can contact us:</Text>
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

export default PrivacyPolicy;