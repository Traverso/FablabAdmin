#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN         9           // Configurable, see typical pin layout above
#define SS_PIN          10          // Configurable, see typical pin layout above
#define serialbufferSize 50 

/**
 * This sketch depends on the MFRC522 library from Miguel Balboa (https://github.com/miguelbalboa/rfid)
 * It will read a MRFC522 card and output the card ID as a Hex string trough serial
 * It will also monitor the serial connection and upon a command it will open a relay 
 */

int pinOut = 5;

MFRC522 mfrc522(SS_PIN, RST_PIN);   // Create MFRC522 instance

char inputBuffer[serialbufferSize]   ; 
int serialIndex = 0; // keep track of where we are in the buffer

void setup() {

        Serial.begin(9600);        // Initialize serial communications with the PC
        SPI.begin();               // Init SPI bus
        mfrc522.PCD_Init();        // Init MFRC522 card
        Serial.println(F("Read MIFARE Card"));
        pinMode(pinOut, OUTPUT);
      
}



void loop() {
       
        if (CheckSerial()) DoCommand(inputBuffer); 
        
        // Look for new cards
        if ( ! mfrc522.PICC_IsNewCardPresent()) {
                return;
        }

        // Select one of the cards
        if ( ! mfrc522.PICC_ReadCardSerial())    return;
        
        
        for (byte i = 0; i < mfrc522.uid.size; i++) {
          Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
          Serial.print(mfrc522.uid.uidByte[i], HEX);
        } 
        Serial.println();        
}

boolean DoCommand(char * commandBuffer)
{
   // Standard way to handle commands
  if (strstr(commandBuffer, "open")){
    Serial.println("Opening the door");
    digitalWrite(pinOut,HIGH);
    delay(1000);
    digitalWrite(pinOut,LOW);
  }  
  return true;
}


boolean CheckSerial()
{
  boolean lineFound = false;

  while (Serial.available() > 0) {
    char charBuffer = Serial.read(); 
      if (charBuffer == '\n') {
           inputBuffer[serialIndex] = 0; // terminate the string
           lineFound = (serialIndex > 0); // only good if we sent more than an empty line
           serialIndex=0; // reset for next line of data
         }
         else if(charBuffer == '\r') {
           // Just ignore the Carrage return, were only interested in new line
         }
         else if(serialIndex < serialbufferSize && lineFound == false) {
           /*Place the character in the string buffer:*/
           inputBuffer[serialIndex++] = charBuffer; // auto increment index
         }
  }// End of While
  return lineFound;
}// End of CheckSerial()
