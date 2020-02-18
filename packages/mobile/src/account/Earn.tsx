import { RootState } from '@celo/mobile/src/redux/reducers'
import TextButton from '@celo/react-components/components/TextButton'
import TextInput from '@celo/react-components/components/TextInput'
import colors from '@celo/react-components/styles/colors'
import fontStyles from '@celo/react-components/styles/fonts'
import * as React from 'react'
import { WithTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { connect } from 'react-redux'
import { showError } from 'src/alert/actions'
import componentWithAnalytics from 'src/analytics/wrapper'
import { refreshFigureEightEarned, setFigureEightAccount } from 'src/app/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { Namespaces, withTranslation } from 'src/i18n'
import { navigateHome } from 'src/navigator/NavigationService'

interface StateProps {
  figureEightEarned: number | null
  figureEightUserId: string | null
}

interface State {
  userId: string | null
}

interface DispatchProps {
  setFigureEightAccount: typeof setFigureEightAccount
  refreshFigureEightEarned: typeof refreshFigureEightEarned
  showError: typeof showError
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    figureEightEarned: state.app.figureEightEarned,
    figureEightUserId: state.app.figureEightUserId,
  }
}

type Props = DispatchProps & WithTranslation & StateProps

export class Earn extends React.Component<Props, State> {
  state = {
    userId: this.props.figureEightUserId,
  }

  onSubmitUserId = () => {
    if (this.state.userId) {
      this.props.setFigureEightAccount(this.state.userId)
      this.props.refreshFigureEightEarned()
    } else {
      this.props.showError(ErrorMessages.INVALID_FIGURE_EIGHT_USER_ID)
    }
  }

  onSubmitLogout = () => {
    this.props.setFigureEightAccount('')
    this.props.refreshFigureEightEarned()
  }

  onTransferToWallet = () => {
    // TODO(anna) transfer balance to wallet
    // TODO add notification
    navigateHome()
  }

  onChangeInput = (userId: string) => {
    this.setState({ userId })
  }

  componentDidMount = () => {
    this.props.refreshFigureEightEarned()
  }

  render() {
    const amountEarned = this.props.figureEightEarned || 0
    return (
      <ScrollView style={style.scrollView} keyboardShouldPersistTaps="handled">
        {this.props.figureEightUserId ? (
          // Complete work when logged in
          <View>
            <Text style={fontStyles.body}>Work will go here</Text>
            <Text style={fontStyles.body}>User ID: {this.props.figureEightUserId}</Text>
            <TextButton onPress={this.onTransferToWallet}>{'Transfer to wallet'}</TextButton>
            <Text style={fontStyles.body}>{`Amount earned: ${amountEarned} dollars`}</Text>
            <TextButton onPress={this.onSubmitLogout}>{'Log out'}</TextButton>
          </View>
        ) : (
          // Require log in before displaying work
          <View>
            <Text style={fontStyles.body}>Please enter your userId</Text>
            <TextInput
              onChangeText={this.onChangeInput}
              value={this.state.userId}
              style={style.inputField}
              // placeholderTextColor={colors.inactive} // TODO(anna) styling
              // underlineColorAndroid="transparent"
              // enablesReturnKeyAutomatically={true}
              // placeholder={t('fullName')}
              // testID={'NameEntry'}
            />
            <TextButton onPress={this.onSubmitUserId}>{'Submit'}</TextButton>
          </View>
        )}
      </ScrollView>
    )
  }
}

export default componentWithAnalytics(
  connect<any, DispatchProps, {}, RootState>(mapStateToProps, {
    refreshFigureEightEarned,
    setFigureEightAccount,
    showError,
  })(withTranslation(Namespaces.accountScreen10)(Earn))
)

const style = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  inputField: {
    marginTop: 25,
    alignItems: 'center',
    borderColor: colors.inputBorder,
    borderRadius: 3,
    borderWidth: 1,
    marginBottom: 6,
    paddingLeft: 9,
    color: colors.inactive,
    height: 50,
  },
})
