import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/Colors';
import Feather from '@expo/vector-icons/Feather';

import MovingWaveform from './MovingWave';

const SCREEN_WIDTH = Dimensions.get('screen').width;

type AudioRecorder = { 
    stopRecording: () => Promise<void>;
    transcribeAudio: () => Promise<void>;
    play?: () => Promise<void>;
}

const AudioRecorder = ({ stopRecording, transcribeAudio, play } : AudioRecorder) => {

    return (
        <>
            <View style={styles.waveformContainer}>
                <TouchableOpacity
                    style={[
                        styles.iconButton,
                        styles.stopButton,
                    ]}
                    onPress={stopRecording}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="stop"
                        size={17}
                        color={Colors.dark.bgSecondary}
                    />
                </TouchableOpacity>
                {/* 
                
                    <TouchableOpacity
                    style={[
                        styles.iconButton,
                        styles.playButton,
                    ]}
                    onPress={play}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="play"
                        size={17}
                        color={Colors.dark.bgSecondary}
                    />
                </TouchableOpacity>
                
                
                */}
                

                <MovingWaveform />

                <TouchableOpacity
                    style={[
                        styles.iconButton,
                        styles.stopButton,
                    ]}
                    onPress={transcribeAudio}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="send"
                        size={17}
                        color={Colors.dark.bgSecondary}
                    />
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    waveformContainer: {
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 10,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingButton: {
        backgroundColor: Colors.dark.txtPrimary,
    },
    stopButton: {
        backgroundColor: Colors.dark.txtPrimary,
    },
    playButton: {
        backgroundColor: Colors.dark.txtPrimary,
    },
    iconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    searchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: Colors.dark.bgPrimary,
        borderRadius: 20,
        paddingHorizontal: 12,
        width: SCREEN_WIDTH - 20,
        height: 40,
    },
});

export default AudioRecorder;